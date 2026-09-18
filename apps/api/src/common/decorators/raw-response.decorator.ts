// apps/api/src/common/decorators/raw-response.decorator.ts
// Opts a route out of ResponseInterceptor's { data, meta } envelope — used
// by GET /health, whose Terminus-shaped body is a semi-standard consumed by
// uptime/k8s tooling and shouldn't be wrapped. Any future raw-response need
// (webhooks, file downloads) uses the same escape hatch.
import { SetMetadata } from "@nestjs/common";

export const RAW_RESPONSE_METADATA_KEY = "fas:raw-response";

export const RawResponse = (): MethodDecorator & ClassDecorator =>
  SetMetadata(RAW_RESPONSE_METADATA_KEY, true);
