-- Drop existing constraint
ALTER TABLE guest_purchases DROP CONSTRAINT IF EXISTS guest_purchases_status_check;

-- Add new constraint with all valid statuses for checkout, express pay, and subscription flows
ALTER TABLE guest_purchases ADD CONSTRAINT guest_purchases_status_check 
CHECK (status IN (
  'created',              -- PaymentIntent criado
  'paid',                 -- Pagamento confirmado  
  'claimed',              -- Conta ativada
  'checkout_pending',     -- Stripe Checkout session criada
  'setup_pending',        -- SetupIntent criado (Apple Pay subscription flow)
  'setup_succeeded',      -- SetupIntent confirmado
  'subscription_active'   -- Subscrição ativa
));