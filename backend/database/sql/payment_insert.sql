INSERT INTO dbo.payments
    (booking_id, amount, payment_date, status, gateway, transaction_reference, payment_method_id, created_at, updated_at)
VALUES
    (:booking_id, :amount, :payment_date, :status, :gateway, :transaction_reference, :payment_method_id, :created_at, :updated_at);
