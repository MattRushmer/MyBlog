import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getContentStore } from "@/adapters";
import { requireSession } from "@/server/auth/require-session";
import { createId } from "@/core/ids";
import { NotFoundError } from "@/core/errors";
import type { EntityMap, EntityType } from "@/core/types";
import { dataResponse, handleRouteError } from "./envelope";

interface RouteContext {
  readonly params: Promise<{ id: string }>;
}

interface ListCreateConfig<T extends EntityType, TInput> {
  readonly type: T;
  readonly inputSchema: z.ZodType<TInput>;
  /** Merge the parsed input into a full, storable entity. Server supplies id/timestamps. */
  readonly buildEntity: (input: TInput, id: string, now: string) => EntityMap[T];
  /** Extra validation the zod schema can't express (e.g. registry membership). Throw ValidationError. */
  readonly validateInput?: (input: TInput) => void;
}

/** GET (list, always includes drafts for admin) + POST (create) for one entity type. */
export function createListCreateHandlers<T extends EntityType, TInput>(config: ListCreateConfig<T, TInput>) {
  async function GET(): Promise<NextResponse> {
    try {
      await requireSession();
      const store = await getContentStore();
      const items = await store.list(config.type, { includeDrafts: true });
      return dataResponse(items);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async function POST(request: NextRequest): Promise<NextResponse> {
    try {
      await requireSession();
      const body = await request.json();
      const input = config.inputSchema.parse(body);
      config.validateInput?.(input);

      const now = new Date().toISOString();
      const entity = config.buildEntity(input, createId(), now);

      const store = await getContentStore();
      const saved = await store.put(config.type, entity);
      return dataResponse(saved, 201);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  return { GET, POST };
}

interface ItemConfig<T extends EntityType, TPatch> {
  readonly type: T;
  readonly patchSchema: z.ZodType<TPatch>;
  readonly validatePatch?: (patch: TPatch) => void;
  /** Runs after the entity is confirmed to exist, before the content-store delete. */
  readonly onDelete?: (entity: EntityMap[T]) => Promise<void>;
}

/** GET (one) + PATCH (partial update) + DELETE for one entity type. */
export function createItemHandlers<T extends EntityType, TPatch>(config: ItemConfig<T, TPatch>) {
  async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
    try {
      await requireSession();
      const { id } = await context.params;
      const store = await getContentStore();
      const item = await store.get(config.type, id);
      if (!item) throw new NotFoundError(config.type, id);
      return dataResponse(item);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
    try {
      await requireSession();
      const { id } = await context.params;
      const body = await request.json();
      const patch = config.patchSchema.parse(body);
      config.validatePatch?.(patch);

      const store = await getContentStore();
      const updated = await store.patch(config.type, id, patch as Partial<Omit<EntityMap[T], "id" | "createdAt">>);
      return dataResponse(updated);
    } catch (error) {
      return handleRouteError(error);
    }
  }

  async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
    try {
      await requireSession();
      const { id } = await context.params;
      const store = await getContentStore();
      const existing = await store.get(config.type, id);
      if (!existing) throw new NotFoundError(config.type, id);

      if (config.onDelete) {
        await config.onDelete(existing);
      }
      await store.delete(config.type, id);
      return dataResponse({ deleted: true });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  return { GET, PATCH, DELETE };
}

const reorderSchema = z.object({ orderedIds: z.array(z.string().min(1)).min(1) });

/** PUT for bulk sortOrder reassignment. Not wired up for 'story' - stories have no sortOrder field. */
export function createReorderHandler(type: EntityType) {
  async function PUT(request: NextRequest): Promise<NextResponse> {
    try {
      await requireSession();
      const body = await request.json();
      const { orderedIds } = reorderSchema.parse(body);
      const store = await getContentStore();
      await store.reorder(type, orderedIds);
      return dataResponse({ reordered: true });
    } catch (error) {
      return handleRouteError(error);
    }
  }

  return { PUT };
}
