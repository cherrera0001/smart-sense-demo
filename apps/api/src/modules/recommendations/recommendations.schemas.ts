/**
 * Schemas Zod del módulo recommendations (Fase 5).
 * El shape de respuesta y la query son el contrato compartido (@smartsense/shared);
 * aquí se re-exportan y se define el path param local.
 */
import { z } from 'zod';
import {
  recommendationApiType,
  recommendationApiStatus,
  recommendationApiPriority,
  recommendationResponseItem,
  recommendationsListResponse,
  recommendationsQuery,
} from '@smartsense/shared';

export {
  recommendationApiType,
  recommendationApiStatus,
  recommendationApiPriority,
  recommendationResponseItem,
  recommendationsListResponse,
  recommendationsQuery,
};
export type {
  RecommendationApiType,
  RecommendationApiStatus,
  RecommendationApiPriority,
  RecommendationResponseItem,
  RecommendationsListResponse,
  RecommendationsQuery,
} from '@smartsense/shared';

/** Path param de GET /installations/:installationId/recommendations. */
export const installationIdParam = z.object({
  installationId: z.string().uuid(),
});
export type InstallationIdParam = z.infer<typeof installationIdParam>;
