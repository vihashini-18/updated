-- PostgreSQL Database Schema for Attendance System

-- Create database
CREATE DATABASE attendance_system;

-- Connect to database
\c attendance_system;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for authentication)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance records table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT')),
    marked_by UUID REFERENCES users(id),
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

-- Camera connections table
CREATE TABLE camera_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Face encodings table (for face recognition)
CREATE TABLE face_encodings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    encoding_data BYTEA NOT NULL,
    video_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_students_email ON students(email);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_face_encodings_student_id ON face_encodings(student_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_camera_connections_updated_at BEFORE UPDATE ON camera_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
-- Default password is 'admin' and 'student' (hashed with bcrypt)
-- Note: You should use proper password hashing in production

INSERT INTO users (email, password_hash, role) VALUES
    ('admin@example.com', '$2b$10$rKvPJZxZxH0F9LqPqX5nOeLqP0BqLHqJKzX0EJ4kGqGqZqKqJqGqG', 'ADMIN'),
    ('student@example.com', '$2b$10$rKvPJZxZxH0F9LqPqX5nOeLqP0BqLHqJKzX0EJ4kGqGqZqKqJqGqG', 'USER');

-- Insert sample students
INSERT INTO students (user_id, roll_number, name, email, image_url) VALUES
    ((SELECT id FROM users WHERE email = 'student@example.com'), 'S002', 'Jane Smith', 'student@example.com', 
     'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d'),
    (NULL, 'S001', 'John Doe', 'john.doe@example.com', 
     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d'),
    (NULL, 'S003', 'Peter Jones', 'peter.jones@example.com', 
     'https://images.unsplash.com/photo-1544005313-94ddf0286df2'),
    (NULL, 'S004', 'Mary Johnson', 'mary.j@example.com', 
     'https://images.unsplash.com/photo-1552058544-f2b08422138a'),
    (NULL, 'S005', 'David Williams', 'dave.w@example.com', 
     'https://images.unsplash.com/photo-1494790108377-be9c29b29330');

-- Insert sample attendance records for the last 10 days
DO $$
DECLARE
    student_rec RECORD;
    date_offset INT;
    current_date DATE;
    random_status VARCHAR(20);
BEGIN
    FOR student_rec IN SELECT id FROM students LOOP
        FOR date_offset IN 0..9 LOOP
            current_date := CURRENT_DATE - date_offset;
            
            -- Random attendance with higher chance of being present
            IF RANDOM() > 0.3 THEN
                random_status := 'PRESENT';
            ELSE
                random_status := 'ABSENT';
            END IF;
            
            INSERT INTO attendance (student_id, date, status, marked_by)
            VALUES (
                student_rec.id,
                current_date,
                random_status,
                (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
            );
        END LOOP;
    END LOOP;
END $$;

-- Useful queries

-- Get student with attendance for a specific date
CREATE OR REPLACE FUNCTION get_student_attendance(p_email VARCHAR, p_date DATE)
RETURNS TABLE (
    student_id UUID,
    roll_number VARCHAR,
    name VARCHAR,
    email VARCHAR,
    image_url TEXT,
    attendance_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.roll_number,
        s.name,
        s.email,
        s.image_url,
        COALESCE(a.status, 'NOT_MARKED')::VARCHAR
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id AND a.date = p_date
    WHERE s.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- Get attendance summary for a student
CREATE OR REPLACE FUNCTION get_attendance_summary(p_student_id UUID)
RETURNS TABLE (
    present_count BIGINT,
    absent_count BIGINT,
    total_count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'PRESENT') as present_count,
        COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_count,
        COUNT(*) as total_count,
        ROUND((COUNT(*) FILTER (WHERE status = 'PRESENT')::NUMERIC / 
               NULLIF(COUNT(*), 0)::NUMERIC) * 100, 2) as percentage
    FROM attendance
    WHERE student_id = p_student_id;
END;
$$ LANGUAGE plpgsql;

-- Get daily attendance summary
CREATE OR REPLACE FUNCTION get_daily_summary(p_date DATE)
RETURNS TABLE (
    total_students BIGINT,
    present_count BIGINT,
    absent_count BIGINT,
    not_marked_count BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(*) FILTER (WHERE a.status = 'PRESENT') as present_count,
        COUNT(*) FILTER (WHERE a.status = 'ABSENT') as absent_count,
        COUNT(DISTINCT s.id) - COUNT(a.id) as not_marked_count,
        ROUND((COUNT(*) FILTER (WHERE a.status = 'PRESENT')::NUMERIC / 
               NULLIF(COUNT(DISTINCT s.id), 0)::NUMERIC) * 100, 2) as percentage
    FROM students s
    LEFT JOIN attendance a ON s.id = a.student_id AND a.date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Calculate attendance streak
CREATE OR REPLACE FUNCTION calculate_attendance_streak(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
    streak INTEGER := 0;
    current_date DATE := CURRENT_DATE;
    has_attendance BOOLEAN;
BEGIN
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM attendance 
            WHERE student_id = p_student_id 
            AND date = current_date 
            AND status = 'PRESENT'
        ) INTO has_attendance;
        
        IF NOT has_attendance THEN
            EXIT;
        END IF;
        
        streak := streak + 1;
        current_date := current_date - 1;
    END LOOP;
    
    RETURN streak;
END;
$$ LANGUAGE plpgsql;