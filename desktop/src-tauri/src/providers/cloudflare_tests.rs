use super::*;

#[test]
fn cloudflare_client_uses_bearer_token_header() {
    let client = CloudflareClient::new("cfut_test_token".to_string()).unwrap();

    let headers = client.auth_headers_for_test().unwrap();

    assert_eq!(headers.get("Authorization").unwrap(), "Bearer cfut_test_token");
    assert!(headers.get("X-Auth-Email").is_none());
    assert!(headers.get("X-Auth-Key").is_none());
}
