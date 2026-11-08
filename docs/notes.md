React 19.3.1 and react-dom 19.3.1 (pinned ~19.3.1); React Three Fiber v9 needs >=19.0 <19.4.
- `worker-configuration.d.ts` declares the Workers HTMLRewriter `Element`, which shadows DOM `append`/`prepend`/`before`/`after`/`replace` in client code. Use `appendChild`/`insertBefore` there.
- GSAP plugins and eases register only when `window` exists: prerender runs in workerd, which rejects timers and random values at global scope ("Disallowed operation called within global scope").
