---
title: Forward proxy vs reverse proxy: what is the difference?
summary: A forward proxy acts for the client and hides it from the server. A reverse proxy acts for the server and hides it from the client. Same mechanics, opposite side.
topic: Architecture
tags: forward-proxy, reverse-proxy, nginx, squid, networking, interview
date: 2026-10-07
post: 017-forward-proxy-vs-reverse-proxy
---

**Short answer:** a forward proxy acts for the **client**. It sits in front of clients and sends their requests out to the internet. A reverse proxy acts for the **server**. It sits in front of servers and receives requests from the internet. The difference is whose identity is hidden and who set the proxy up.

## 1. Forward proxy

- Clients are configured to send traffic through it (a browser or OS setting, or a network rule).
- The server sees the proxy's IP, not the client's. The server usually does not know the proxy is there.
- Uses: hiding client identity, corporate content filtering, access control and logging, caching shared downloads, bypassing geo restrictions, and giving a locked-down network controlled outbound access.
- Examples: Squid, corporate proxies, proxy services.

```flow
# Forward proxy: acts for the client
Client -> ok: Forward proxy -> Internet -> Server
Server -> warn: sees the proxy, not the client
```

## 2. Reverse proxy

- Clients do not know it exists. They think they are talking to the real server.
- The client sees the proxy's address, not the backend servers'.
- Uses: load balancing, TLS termination, caching, compression, hiding and protecting the backend, WAF.
- Examples: Nginx, HAProxy, Envoy, Cloudflare.

```flow
# Reverse proxy: acts for the server
Client -> Internet -> ok: Reverse proxy -> Server A
Reverse proxy -> Server B
Client -> warn: sees the proxy, not the servers
```

## 3. How to tell them apart

Ask **who is being protected or hidden**:

- Client hidden from the server: forward proxy.
- Server hidden from the client: reverse proxy.

Another test is who knows about it. The client knows about a forward proxy, because it is configured to use it. The server owner knows about a reverse proxy, because they set it up, and clients do not.

## 4. Side by side

| | Forward proxy | Reverse proxy |
|---|---|---|
| Acts for | The client | The server |
| Sits in front of | Clients (outbound traffic) | Servers (inbound traffic) |
| Hides | Client identity | Backend servers |
| Configured by | Client or client network | Server owner |
| Client aware of it | Yes (or the network forces it) | No |
| Typical uses | Filtering, access control, anonymity, shared cache | Load balancing, TLS, caching, WAF |
| Examples | Squid, corporate proxy | Nginx, HAProxy, Envoy |

## 5. Special case: transparent proxy

A network device can intercept client traffic without any client configuration. It is still a forward proxy, because it acts for the clients. "The client did not configure it" does not make it a reverse proxy.

## 6. Common mistakes

- **Mixing up the direction:** both sit in the middle, so people forget whose side the proxy is on.
- **Treating a forward proxy as a security guarantee:** for HTTPS it only tunnels with CONNECT, unless it does TLS interception, which has privacy and trust costs.
- **Treating a VPN and a forward proxy as the same:** a VPN tunnels all device traffic at the network level, while a proxy handles specific application traffic.

## Interview one-liner

> A forward proxy sits in front of clients and sends their requests out, hiding the client from the server, for filtering, access control and anonymity. A reverse proxy sits in front of servers and receives client requests, hiding the backend, for load balancing, TLS, caching and protection. Same mechanics, opposite side.

## Cross questions to expect

1. What is a transparent proxy?
2. Proxy vs VPN?
3. How does HTTPS work through a forward proxy (CONNECT and TLS interception)?
