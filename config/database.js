// config/database.js
import { createPool } from 'mysql2/promise';

const pool = createPool(process.env.DB_CONNECTION_STRING, {
  connectionLimit: 100,
  waitForConnections: true,
  queueLimit: 0,
  multipleStatements: false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database connection:', err);
});

export default pool;