const base = process.env.BASE_URL ?? "http://localhost:3000";
const wsUrl = base.replace("http", "ws") + "/ws";
const headers = { "Content-Type": "application/json", "x-demo-user-id": "seller-1", "x-demo-user-name": "Seller" };

const created = await fetch(`${base}/api/auctions`, {
  method: "POST",
  headers,
  body: JSON.stringify({ title: "Test item", startPricePaise: 10000, minIncrementPaise: 500, countdownSeconds: 2 }),
});
const createdJson = await created.json();
console.log("create:", created.status, createdJson.auction?.id, createdJson.auction?.status);
const auctionId = createdJson.auction.id;

async function connect(userId, name) {
  const results = [];
  const waiters = [];
  const ws = await new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => socket.send(JSON.stringify({ type: "auth", userId, name }));
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "authed") resolve(socket);
      if (msg.type === "bid_result") {
        if (waiters.length) waiters.shift()(msg);
        else results.push(msg);
      }
    };
    socket.onerror = reject;
  });
  ws.send(JSON.stringify({ type: "join", auctionId }));
  async function bid(amountPaise, clientBidId) {
    ws.send(JSON.stringify({ type: "place_bid", amountPaise, clientBidId }));
    const result = results.length ? results.shift() : await new Promise((resolve) => waiters.push(resolve));
    console.log(`${name} bid ${amountPaise}:`, result.status, result.reason ?? "", "current:", result.auction?.currentPricePaise);
  }
  return { ws, bid };
}

await new Promise((r) => setTimeout(r, 500));
const asha = await connect("bidder-1", "Asha");
const rahul = await connect("bidder-2", "Rahul");
await new Promise((r) => setTimeout(r, 2500));
await asha.bid(15000, "bid-1");
await rahul.bid(14000, "bid-2");
await rahul.bid(15500, "bid-3");
asha.ws.close();
rahul.ws.close();
process.exit(0);
