// apps/api/src/common/common.module.ts
// Wires up the cross-cutting request-pipeline pieces: global response
// envelope + entity serialization (interceptors), and the global exception
// filter (provided here, then registered explicitly in main.ts — see that
// file's comment for why).
import { ClassSerializerInterceptor, Module } from "@nestjs/common";
import { APP_INTERCEPTOR, Reflector } from "@nestjs/core";
import { AllExceptionsFilter } from "./filters/all-exceptions.filter.js";
import { ResponseInterceptor } from "./interceptors/response.interceptor.js";

@Module({
  providers: [
    AllExceptionsFilter,
    // Order matters: providers registered earlier under the same token wrap
    // outer, so ResponseInterceptor's { data, meta } wrapping runs *after*
    // ClassSerializerInterceptor has already stripped @Exclude() fields off
    // the raw handler output (see response.interceptor.ts's file comment).
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) =>
        new ClassSerializerInterceptor(reflector, { excludeExtraneousValues: false }),
      inject: [Reflector],
    },
  ],
  exports: [AllExceptionsFilter],
})
export class CommonModule {}
