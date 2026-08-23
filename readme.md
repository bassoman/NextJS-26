This is the baseline configuration for the CARC website.

## PayPal credentials (sandbox / live)

PayPal client id/secret are never committed. Place them in:

- `secrets/paypal/sandbox.env` — sandbox credentials
- `secrets/paypal/live.env` — live credentials

Both files are gitignored (matched by the repo's `*.env` rule). Each contains:

```
ENVIRONMENT=development            # or production, for live.env
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com   # or https://api-m.paypal.com, for live.env
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

Fill in the `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` values. Sandbox vs. live behavior comes from the credentials themselves.

## Running the PayPal backend (backend_paypal/)

Which credentials file loads is controlled by `NODE_ENV`:

- `npm run dev` (sets `NODE_ENV=development`) → loads `secrets/paypal/sandbox.env`
- `npm start` / `npm run prod` (sets `NODE_ENV=production`) → loads `secrets/paypal/live.env`
- `pm2 start ecosystem.config.cjs --env production` / `--env development` → same selection via pm2's env blocks

From `backend_paypal/`:

```
npm install
npm run dev     # local development against PayPal sandbox
npm start       # production run against PayPal live
```

