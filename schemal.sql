DROP DATABASE IF EXISTS sohoavb;

CREATE DATABASE IF NOT EXISTS sohoavb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sohoavb;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Tên đăng nhập',
    password TEXT NOT NULL COMMENT 'Mật khẩu đã mã hóa (bcrypt)',
    role ENUM('admin', 'user') DEFAULT 'user' COMMENT 'Vai trò: admin hoặc user',
    full_name VARCHAR(100) NOT NULL COMMENT 'Họ và tên',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT 'Email',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Bảng quản lý tài khoản';

CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number VARCHAR(50) NOT NULL COMMENT 'Số hiệu văn bản (1146, 01/QĐ-UBND...)',
    type VARCHAR(50) NOT NULL COMMENT 'Loại văn bản (Kế hoạch, Quyết định...)',
    name TEXT NOT NULL COMMENT 'Trích yếu / Nội dung tóm tắt',
    issued_date DATE NULL COMMENT 'Ngày ban hành văn bản',
    file_path VARCHAR(255) NOT NULL COMMENT 'Đường dẫn file trong /public/uploads',
    file_size BIGINT NULL COMMENT 'Kích thước file (bytes)',
    file_name_original VARCHAR(255) NULL COMMENT 'Tên file gốc người dùng upload',
    user_id INT NOT NULL COMMENT 'ID của người dùng upload',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian upload',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Cập nhật tự động',
    INDEX idx_number (number),
    INDEX idx_type (type),
    INDEX idx_issued_date (issued_date),
    INDEX idx_created_at (created_at),
    FULLTEXT KEY ft_name (name),
    UNIQUE KEY uc_number_type (number, type),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = 'Bảng quản lý văn bản';

-- Tạo tài khoản admin mặc định
INSERT INTO
    users (
        username,
        password,
        role,
        full_name,
        email
    )
VALUES (
        'admin',
        '$2b$10$ThxH/e66e5AoYbO7Gq.bJepsRG9P/Xt4PFLyqKwZ/VDEkcfo.aOiu',
        'admin',
        'Administrator',
        'admin@example.com'
    );