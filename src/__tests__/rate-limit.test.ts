import { rateLimit, getClientIp } from "@/lib/rate-limit";

describe("Rate Limiter", () => {
  describe("getClientIp", () => {
    it("extracts IP from x-forwarded-for header", () => {
      const request = new Request("http://localhost", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      });
      expect(getClientIp(request)).toBe("1.2.3.4");
    });

    it("extracts IP from x-real-ip header", () => {
      const request = new Request("http://localhost", {
        headers: { "x-real-ip": "9.8.7.6" },
      });
      expect(getClientIp(request)).toBe("9.8.7.6");
    });

    it("returns 127.0.0.1 as fallback", () => {
      const request = new Request("http://localhost");
      expect(getClientIp(request)).toBe("127.0.0.1");
    });
  });

  describe("rateLimit", () => {
    it("allows requests within limit", () => {
      const request = new Request("http://localhost", {
        headers: { "x-forwarded-for": "test-ip-allow" },
      });
      const result = rateLimit(request, "standard");
      expect(result).toBeNull(); // null means allowed
    });

    it("blocks after exceeding limit", () => {
      // Make 11 requests with strict limit (10/min)
      const ip = `test-ip-block-${Date.now()}`;
      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost", {
          headers: { "x-forwarded-for": ip },
        });
        rateLimit(req, "strict");
      }

      // 11th request should be blocked
      const req = new Request("http://localhost", {
        headers: { "x-forwarded-for": ip },
      });
      const result = rateLimit(req, "strict");
      expect(result).not.toBeNull();
      // Check it returns 429
      if (result) {
        expect(result.status).toBe(429);
      }
    });
  });
});
