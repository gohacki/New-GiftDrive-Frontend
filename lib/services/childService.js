// File: lib/services/childService.js
import pool from '../../config/database'; // Adjust path

/**
 * Fetches items for a specific child.
 * (Logic from pages/api/children/[childId]/items/index.js GET handler)
 */
export async function getChildItems(childId) {
  const numericChildId = parseInt(childId, 10);
  if (isNaN(numericChildId)) {
    throw new Error("Invalid Child ID format.");
  }
  const [rows] = await pool.query(`
        SELECT
          ci.child_item_id, ci.child_id, ci.item_id, ci.quantity AS needed,
          ci.selected_rye_variant_id, ci.selected_rye_marketplace,
          ci.variant_display_name, ci.variant_display_price, ci.variant_display_photo,
          i.name AS base_item_name, i.description AS base_item_description,
          i.price AS base_item_price, i.image_url AS base_item_photo,
          i.rye_product_id AS base_rye_product_id, i.marketplace AS base_marketplace,
          i.is_rye_linked AS base_is_rye_linked,
          COALESCE((
            SELECT SUM(oi.quantity) FROM order_items oi
            WHERE oi.source_child_item_id = ci.child_item_id
          ), 0) AS purchased
        FROM child_items ci
        JOIN items i ON ci.item_id = i.item_id
        WHERE ci.child_id = ? AND ci.is_active = 1
    `, [numericChildId]);

  return rows.map(r => ({
    child_item_id: r.child_item_id,
    child_id: r.child_id,
    item_id: r.item_id,
    needed: Number(r.needed) || 0,
    purchased: Number(r.purchased) || 0,
    remaining: Math.max(0, (Number(r.needed) || 0) - (Number(r.purchased) || 0)),
    selected_rye_variant_id: r.selected_rye_variant_id,
    selected_rye_marketplace: r.selected_rye_marketplace,
    variant_display_name: r.variant_display_name,
    variant_display_price: r.variant_display_price !== null ? parseFloat(r.variant_display_price) : null,
    variant_display_photo: r.variant_display_photo,
    base_item_name: r.base_item_name,
    base_item_photo: r.base_item_photo,
    base_item_price: r.base_item_price !== null ? parseFloat(r.base_item_price) : null,
    base_item_description: r.base_item_description,
    base_rye_product_id: r.base_rye_product_id,
    base_marketplace: r.base_marketplace,
    is_rye_linked: Boolean(r.base_is_rye_linked),
  }));
}