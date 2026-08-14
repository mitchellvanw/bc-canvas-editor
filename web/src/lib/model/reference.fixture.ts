/**
 * The Canvas-file reference example from SPEC §3.1, byte for byte — the shared
 * fixture for the serializer and parser tests, for the renderer, and for the
 * CLI's own suite — single-sourced so the copies can't drift from the spec or
 * each other. The version-1 form below is here for the same reason: the
 * migration's fixture is also what `bcc` is driven against to show that the
 * version gate is one-sided.
 */
export const REFERENCE_FILE = `{
  "version": 2,
  "name": "Order Fulfillment",
  "purpose": "Coordinates picking, packing and shipping once an order is paid.",
  "strategicClassification": {
    "domain": "core",
    "businessModel": "revenue",
    "evolution": "custom-built"
  },
  "domainRoles": [
    { "name": "execution context" }
  ],
  "inboundCommunication": [
    {
      "collaborator": { "name": "Checkout" },
      "relationship": { "ours": "customer-supplier" },
      "messages": [
        { "type": "command", "name": "Place Order" },
        { "type": "event", "name": "Payment Confirmed", "description": "Triggers fulfillment." }
      ]
    }
  ],
  "ubiquitousLanguage": [
    { "term": "Shipment", "definition": "A physical parcel dispatched against an order." }
  ],
  "businessDecisions": [
    { "name": "No partial shipments", "description": "An order ships complete or not at all." }
  ],
  "outboundCommunication": [
    {
      "collaborator": { "name": "Notifications", "kind": "bounded-context" },
      "relationship": { "theirs": "conformist", "ours": "open-host-service" },
      "messages": [{ "type": "event", "name": "Order Shipped" }]
    }
  ],
  "assumptions": ["Warehouse stock counts are accurate within the hour."],
  "verificationMetrics": ["Time from payment to dispatch under 4 hours."],
  "openQuestions": ["Who owns returns — this context or a new one?"]
}`;

/**
 * The SPEC §3.1 reference example as version 1 wrote it — `description` where
 * v2 says `purpose`, both lane fields as plain strings. The v1 → v2 migration's
 * own fixture.
 */
export const V1_REFERENCE_FILE = `{
  "version": 1,
  "name": "Order Fulfillment",
  "description": "Coordinates picking, packing and shipping once an order is paid.",
  "strategicClassification": {
    "domain": "core",
    "businessModel": "revenue",
    "evolution": "custom-built"
  },
  "domainRoles": [
    { "name": "execution context" },
    { "name": "octopus coordinator" }
  ],
  "inboundCommunication": [
    {
      "collaborator": "Checkout",
      "relationship": "customer-supplier",
      "messages": [
        { "type": "command", "name": "Place Order" },
        { "type": "event", "name": "Payment Confirmed", "description": "Triggers fulfillment." }
      ]
    }
  ],
  "ubiquitousLanguage": [
    { "term": "Shipment", "definition": "A physical parcel dispatched against an order." }
  ],
  "businessDecisions": [
    { "name": "No partial shipments", "description": "An order ships complete or not at all." }
  ],
  "outboundCommunication": [
    { "collaborator": "Notifications", "messages": [{ "type": "event", "name": "Order Shipped" }] }
  ],
  "assumptions": ["Warehouse stock counts are accurate within the hour."],
  "verificationMetrics": ["Time from payment to dispatch under 4 hours."],
  "openQuestions": ["Who owns returns — this context or a new one?"]
}`;
