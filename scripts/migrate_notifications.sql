-- Nâng cấp bảng document_recipients để hỗ trợ trạng thái phê duyệt
ALTER TABLE document_recipients 
ADD COLUMN status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending' AFTER user_id,
ADD COLUMN processed_at DATETIME DEFAULT NULL AFTER status;

-- Tạo bảng thông báo (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'Người nhận thông báo',
    sender_id INT NOT NULL COMMENT 'Người tạo ra thông báo/hành động',
    doc_id INT DEFAULT NULL COMMENT 'ID văn bản liên quan (nếu có)',
    type ENUM('share_request', 'share_accepted', 'share_rejected', 'system') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_doc FOREIGN KEY (doc_id) REFERENCES documents (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
