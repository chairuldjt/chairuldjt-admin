import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function initDB() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
        });

        console.log('🚀 Connecting to MySQL...');

        // 1. Create Database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
        console.log(`✅ Database "${process.env.DB_NAME}" is ready.`);

        await connection.changeUser({ database: process.env.DB_NAME });

        // 2. Create Users Table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ "users" table is ready.');

        // 3. Create Default Admin User
        const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['chairul']);

        if (rows.length === 0) {
            const hashedPassword = await bcrypt.hash('190701', 10);
            await connection.query(
                'INSERT INTO users (username, password, full_name) VALUES (?, ?, ?)',
                ['chairul', hashedPassword, 'Chairul Admin']
            );
            console.log('✅ Default user "chairul" created (password: 190701).');
        } else {
            console.log('ℹ️ User "chairul" already exists, skipping creation.');
        }

        // 4. Create Settings Table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) NOT NULL UNIQUE,
        setting_value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        // Insert default empty settings for Telegram
        const [tgToken] = await connection.query('SELECT * FROM settings WHERE setting_key = ?', ['telegram_token']);
        if (tgToken.length === 0) {
            await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['telegram_token', '']);
            await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['telegram_chat_id', '']);
            await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['alert_threshold', '90']);
            await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['alert_cooldown', '10']);
            console.log('✅ Settings initialized in DB (Telegram + Monitoring Rules).');
        } else {
            // Ensure new keys exist for existing installations
            const [thresh] = await connection.query('SELECT * FROM settings WHERE setting_key = ?', ['alert_threshold']);
            if (thresh.length === 0) {
                await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['alert_threshold', '90']);
                await connection.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', ['alert_cooldown', '10']);
                console.log('✅ Monitoring rules settings added.');
            }
        }

        console.log('\n✨ Database initialization complete!');
        await connection.end();
    } catch (err) {
        console.error('❌ Error initializing database:');
        console.error(err);
        process.exit(1);
    }
}

initDB();
