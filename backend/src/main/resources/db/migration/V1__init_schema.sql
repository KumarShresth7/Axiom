CREATE TABLE users (
                       id UUID PRIMARY KEY,
                       email VARCHAR(255) UNIQUE NOT NULL,
                       password_hash VARCHAR(255) NOT NULL,
                       role VARCHAR(20) NOT NULL,
                       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
                          id UUID PRIMARY KEY,
                          user_id UUID NOT NULL UNIQUE,
                          username VARCHAR(50) UNIQUE NOT NULL,
                          elo_rating INTEGER NOT NULL DEFAULT 1200,
                          matches_played INTEGER NOT NULL DEFAULT 0,
                          win_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
                          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                          CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_profiles_elo ON profiles(elo_rating);