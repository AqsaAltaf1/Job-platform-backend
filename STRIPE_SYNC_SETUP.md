# Stripe Sync Setup Guide

This guide explains how to set up bidirectional synchronization between your website and Stripe for subscription packages.

## Features

✅ **Bidirectional Sync**: Packages created in either Stripe or your website sync to the other
✅ **Real-time Updates**: Webhooks ensure instant synchronization
✅ **Automatic Archiving**: Archived packages in Stripe are marked inactive on your website
✅ **Deletion Handling**: Deleted packages in Stripe are marked inactive (not deleted) on your website
✅ **Metadata Sync**: Features, limits, and other metadata are synchronized

## Setup Instructions

### 1. Environment Variables

Add these environment variables to your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Stripe Webhook Configuration

1. Go to your Stripe Dashboard → Webhooks
2. Create a new webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select these events:
   - `product.created`
   - `product.updated`
   - `product.deleted`
   - `price.created`
   - `price.updated`
   - `price.deleted`
4. Copy the webhook secret and add it to your environment variables

### 3. Database Migration

The database schema has been updated to support the new package structure. Make sure you've run the migrations:

```bash
# Apply the migrations
sudo -u postgres psql -d job -f migrations/029_update_subscription_plans_structure.sql
sudo -u postgres psql -d job -f migrations/030_make_old_subscription_columns_nullable.sql
```

### 4. Install Stripe Package

Make sure you have the Stripe package installed:

```bash
npm install stripe
```

## How It Works

### Website → Stripe Sync

When you create/update a package on your website:

1. Package is saved to your database
2. System automatically creates/updates the corresponding Stripe product
3. Stripe price is created/updated with the correct billing cycle
4. Metadata (features, limits) is synced to Stripe

### Stripe → Website Sync

When you create/update a package in Stripe:

1. Stripe webhook is triggered
2. System updates the corresponding package in your database
3. Package is marked active/inactive based on Stripe status
4. Metadata is synced from Stripe to your database

### Deletion and Archiving

- **Stripe Deletion**: Package is marked as `is_active: false` on your website
- **Stripe Archiving**: Package is marked as `is_active: false` and hidden from pricing pages
- **Website Deletion**: Package is deleted from both your database and Stripe

## API Endpoints

### Admin Endpoints (Require super_admin role)

- `POST /api/stripe/sync-from-stripe/:productId` - Sync specific package from Stripe
- `POST /api/stripe/sync-to-stripe/:planId` - Sync specific package to Stripe
- `GET /api/stripe/products` - Get all Stripe products
- `POST /api/stripe/sync-all-from-stripe` - Sync all packages from Stripe

### Webhook Endpoint

- `POST /api/stripe/webhook` - Stripe webhook handler (no auth required)

## Frontend Integration

### Admin Panel

1. Go to `/admin/packages/stripe-sync`
2. View all Stripe products
3. Sync individual packages or all packages at once
4. Monitor sync status

### Package Management

The existing package management page (`/admin/packages`) now automatically syncs to Stripe when packages are created/updated.

## Testing

### Test Stripe Sync

1. Create a package in Stripe Dashboard
2. Go to `/admin/packages/stripe-sync`
3. Click "Sync to Website" for the package
4. Verify the package appears in `/admin/packages`

### Test Website Sync

1. Create a package in `/admin/packages`
2. Check your Stripe Dashboard
3. Verify the product and price were created

### Test Webhooks

1. Update a package in Stripe Dashboard
2. Check your website - changes should appear automatically
3. Archive a package in Stripe - it should become inactive on your website

## Troubleshooting

### Common Issues

1. **Webhook not working**: Check webhook URL and secret
2. **Sync failing**: Verify Stripe API keys and permissions
3. **Database errors**: Ensure migrations are applied correctly

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=stripe:*
```

### Check Webhook Logs

View webhook events in your Stripe Dashboard → Webhooks → [Your Webhook] → Events

## Security Notes

- Webhook endpoints verify Stripe signatures
- All admin endpoints require super_admin authentication
- Stripe API keys should be kept secure
- Use test keys for development, live keys for production

## Production Deployment

1. Update webhook URL to your production domain
2. Use live Stripe API keys
3. Test webhook delivery
4. Monitor sync status regularly

## Support

For issues with Stripe sync:

1. Check webhook logs in Stripe Dashboard
2. Review server logs for errors
3. Verify environment variables
4. Test API endpoints manually
