import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(req: Request) {
  let connection;
  try {
    const body = await req.json();
    const { key, user_id, username, payload, cqs } = body;

    const API_SECRET = process.env.API_SECRET;
    
    if (key !== API_SECRET) {
      return NextResponse.json({ error: "Unauthorized: Wrong Key" }, { status: 403 });
    }

    if (!username || !payload) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,      
      user: process.env.DB_USER,     
      password: process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,  
      connectTimeout: 20000 
    });

    const scrapedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [rows]: any = await connection.execute(
      "SELECT id FROM saved_scrapes WHERE username = ?",
      [username]
    );

    let message = "";

    if (rows.length > 0) {
      await connection.execute(
        `UPDATE saved_scrapes 
         SET payload = ?, scraped_at = ?, user_id = ?, cqs = ? 
         WHERE username = ?`,
        [payload, scrapedAt, user_id || 0, cqs || 'Lowest', username]
      );
      message = `Updated record for ${username}`;
    } else {
      await connection.execute(
        `INSERT INTO saved_scrapes (user_id, username, payload, scraped_at, cqs) 
         VALUES (?, ?, ?, ?, ?)`,
        [user_id || 0, username, payload, scrapedAt, cqs || 'Lowest']
      );
      message = `Inserted record for ${username}`;
    }

    return NextResponse.json({ success: true, message });

  } catch (error: any) {
    console.error("❌ Database Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    
  } finally {
    if (connection) await connection.end();
  }
}