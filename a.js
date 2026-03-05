import bcrypt from 'bcryptjs';

const password = '123456';
const saltRounds = 10;

async function generateHash() {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('🔐 Mật khẩu gốc:', password);
    console.log('💾 Mã hoá bcrypt:', hash);
}

generateHash();
