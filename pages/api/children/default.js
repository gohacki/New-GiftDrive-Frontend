// File: pages/api/children/[childId].js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import pool from "../../../config/database";
import { validationResult, param } from 'express-validator';
import { runMiddleware } from '../../../lib/runMiddleware'; // Assuming you have this helper

// Validation middleware for GET and DELETE (only param check)
const validateChildIdParam = [
    param('childId').isInt({ gt: 0 }).withMessage('Child ID must be a positive integer.'),
    async (req, res, next) => {
        await runMiddleware(req, res, (r, s, cb) => {
            const errors = validationResult(r);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            cb();
        });
        next(); // Important to call next() or ensure the handler proceeds
    }
];


export default async function handler(req, res) {
    const { childId: childIdFromQuery } = req.query;

    // Apply validation middleware for childId parameter
    for (const middleware of validateChildIdParam) {
        let errorOccurred = false;
        await new Promise((resolve, reject) => {
            middleware(req, res, (result) => {
                if (result instanceof Error) {
                    errorOccurred = true;
                    reject(result);
                }
                resolve(result);
            });
        });
        if (errorOccurred || res.writableEnded) return; // Stop if validation failed and sent response
    }

    const childId = parseInt(childIdFromQuery, 10);

    if (req.method === 'GET') {
        // This route is public in your Express setup
        try {
            const [childRows] = await pool.query(`
                SELECT
                  uc.child_id,
                  dc.name AS child_name,
                  dc.photo AS photo,
                  d.drive_id,
                  d.name AS drive_name,
                  o.org_id,
                  o.name AS organization_name
                FROM unique_children uc
                JOIN default_children dc ON uc.default_child_id = dc.default_child_id
                JOIN drives d ON uc.drive_id = d.drive_id
                JOIN organizations o ON d.org_id = o.org_id
                WHERE uc.child_id = ?;
            `, [childId]);

            if (childRows.length === 0) {
                return res.status(404).json({ error: 'Child not found' });
            }
            return res.status(200).json(childRows[0]);
        } catch (error) {
            console.error('Error fetching child details:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    } else if (req.method === 'DELETE') {
        const session = await getServerSession(req, res, authOptions);
        if (!session || !session.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        const user = session.user;
        const userOrgId = user.org_id;

        if (!user.is_org_admin) { // Only org admins or super admins can delete
            return res.status(403).json({ error: 'Forbidden: Not an organization admin.' });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [childOrgRows] = await connection.query(
                `SELECT d.org_id FROM unique_children uc JOIN drives d ON uc.drive_id = d.drive_id WHERE uc.child_id = ?`,
                [childId]
            );
            if (childOrgRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Child not found.' });
            }
            // Authorization check: org admin can only delete children in their own org
            if (user.is_org_admin && childOrgRows[0].org_id !== userOrgId && !user.is_super_admin) {
                await connection.rollback();
                return res.status(403).json({ error: 'Forbidden: Child does not belong to your organization.' });
            }


            // Delete associated cart_contents and child_items (same logic as Express)
            const [childItemIdsRows] = await connection.query('SELECT child_item_id FROM child_items WHERE child_id = ?', [childId]);
            if (childItemIdsRows.length > 0) {
                const ids = childItemIdsRows.map(ci => ci.child_item_id);
                await connection.query('DELETE FROM cart_contents WHERE source_child_item_id IN (?)', [ids]);
                // Optional: Handle order_items deletion/archival if rules are defined
                console.warn(`Order items related to child_items of child ${childId} might need manual review or archival if they exist.`);
            }
            await connection.query('DELETE FROM child_items WHERE child_id = ?', [childId]);
            const [deleteResult] = await connection.query('DELETE FROM unique_children WHERE child_id = ?', [childId]);

            if (deleteResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Child not found for deletion or already deleted.' });
            }

            await connection.commit();
            return res.status(200).json({ message: 'Child removed successfully.' });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Error removing child:', error);
            return res.status(500).json({ error: 'Internal server error' });
        } finally {
            if (connection) connection.release();
        }
    } else {
        res.setHeader('Allow', ['GET', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}