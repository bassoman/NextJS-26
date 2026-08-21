use lambda_runtime::{service_fn, Error, LambdaEvent};
use paypal_client::{CartItem, PayPalClient};
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;
use tracing::{error, info};

#[derive(Debug, Deserialize)]
struct CreateOrderRequest {
    cart: Vec<CartItem>,
}

async fn function_handler(
    paypal: Arc<PayPalClient>,
    event: LambdaEvent<CreateOrderRequest>,
) -> Result<Value, Error> {
    let (request, context) = event.into_parts();
    info!(request_id = %context.request_id, "creating paypal order");

    let cart_item = request
        .cart
        .first()
        .ok_or_else(|| Error::from("cart must contain at least one item"))?;

    let order = paypal.create_order(cart_item).await.map_err(|e| {
        error!(error = %e, "failed to create paypal order");
        e
    })?;

    Ok(order)
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .without_time()
        .init();

    let paypal = Arc::new(PayPalClient::new());

    lambda_runtime::run(service_fn(move |event| {
        let paypal = Arc::clone(&paypal);
        async move { function_handler(paypal, event).await }
    }))
    .await
}
