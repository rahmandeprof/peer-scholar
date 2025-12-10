-- Database Schema Reference
-- This file documents the custom tables created for peer-scholar
-- Run these commands in Supabase SQL Editor if tables need to be recreated

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";



/* ===========================================================
   personal_course
   =========================================================== */

CREATE TABLE IF NOT EXISTS personal_course (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    code VARCHAR,
    color VARCHAR NOT NULL DEFAULT '#3B82F6',
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_personal_course_user
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_personal_course_user
    ON personal_course (user_id);



/* ===========================================================
   Junction table: personal_course ↔ material
   =========================================================== */

CREATE TABLE IF NOT EXISTS personal_course_material (
    personal_course_id UUID NOT NULL,
    material_id UUID NOT NULL,
    PRIMARY KEY (personal_course_id, material_id),
    CONSTRAINT fk_pcm_course
        FOREIGN KEY (personal_course_id) REFERENCES personal_course(id) ON DELETE CASCADE,
    CONSTRAINT fk_pcm_material
        FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE CASCADE
);

-- Helpful reverse lookup index
CREATE INDEX IF NOT EXISTS idx_pcm_material
    ON personal_course_material (material_id);



/* ===========================================================
   public_note (annotation system)
   =========================================================== */

CREATE TABLE IF NOT EXISTS public_note (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    selected_text TEXT NOT NULL,
    note TEXT NOT NULL,
    page_number INTEGER,
    material_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_public_note_material
        FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE CASCADE,
    CONSTRAINT fk_public_note_user
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_public_note_material
    ON public_note (material_id);

CREATE INDEX IF NOT EXISTS idx_public_note_user
    ON public_note (user_id);



/* ===========================================================
   public_note_vote
   =========================================================== */

CREATE TABLE IF NOT EXISTS public_note_vote (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value INTEGER NOT NULL,
    note_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT fk_public_note_vote_note
        FOREIGN KEY (note_id) REFERENCES public_note(id) ON DELETE CASCADE,
    CONSTRAINT fk_public_note_vote_user
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT uq_public_note_vote_user_note UNIQUE (user_id, note_id),
    CONSTRAINT chk_public_note_vote_value CHECK (value IN (1, -1))
);



/* ===========================================================
   Trigger to auto-update updated_at columns
   =========================================================== */

-- Create trigger function once
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER trg_personal_course_set_updated_at
BEFORE UPDATE ON personal_course
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_public_note_set_updated_at
BEFORE UPDATE ON public_note
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
