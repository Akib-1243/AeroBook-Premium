INSERT INTO dbo.payments
    (booking_id, amount, payment_date, status, created_at, updated_at)
VALUES
    (:booking_id, :amount, :payment_date, 'paid', :created_at, :updated_at);
