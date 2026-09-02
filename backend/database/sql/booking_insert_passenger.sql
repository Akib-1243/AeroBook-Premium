INSERT INTO dbo.passengers
    (user_id, name, email, passport, frequent_flyer_points, created_at, updated_at)
OUTPUT INSERTED.id
VALUES
    (:user_id, :name, :email, :passport, 0, :created_at, :updated_at);
