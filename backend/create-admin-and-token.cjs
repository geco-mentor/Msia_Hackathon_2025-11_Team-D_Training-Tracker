const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET;

async function createAdmin() {
    const username = `admin${Math.floor(Math.random() * 1000)}`;
    const password = 'adminpassword123'; // WARNING: Hardcoded for local testing only. Do not use in production.
    const password_hash = await bcrypt.hash(password, 10);

    console.log(`Creating admin: ${username}`);

    const { data: admin, error } = await supabase
        .from('admins')
        .insert({
            name: 'Test Admin',
            username: username,
            password_hash: password_hash
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating admin:', error);
        return;
    }

    console.log('Admin created:', admin);

    const token = jwt.sign(
        {
            id: admin.id,
            username: admin.username,
            role: 'admin'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    const tokenData = {
        token,
        user: {
            id: admin.id,
            name: admin.name,
            username: admin.username,
            role: 'admin'
        }
    };

    fs.writeFileSync(path.join(__dirname, 'admin_token.json'), JSON.stringify(tokenData, null, 2));
    console.log('Admin token saved to admin_token.json');
}

createAdmin();
