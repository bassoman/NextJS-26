use lambda_runtime::{service_fn, Error, LambdaEvent};
use paypal_client::PayPalClient;
use serde::Deserialize;
use serde_json::Value;
use std::sync::Arc;
use tracing::{error, info};

#[derive(Debug, Deserialize)]
struct CaptureOrderRequest {
    #[serde(rename = "orderID")]
    order_id: String,
}

async fn function_handler(
    paypal: Arc<PayPalClient>,
    event: LambdaEvent<CaptureOrderRequest>,
) -> Result<Value, Error> {
    let (request, context) = event.into_parts();
    info!(request_id = %context.request_id, order_id = %request.order_id, "capturing paypal order");

    let order = paypal.capture_order(&request.order_id).await.map_err(|e| {
        error!(error = %e, "failed to capture paypal order");
        e
    })?;

    // the caller (future transaction store) is responsible for persisting this response;
    // this Lambda only talks to PayPal and returns its raw JSON
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
