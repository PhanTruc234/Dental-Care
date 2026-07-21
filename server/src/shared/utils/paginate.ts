export type Paged<T> = {
    items: T[];
    meta: { page: number; limit: number; total: number; totalPages: number };
};

export const skipTake = (page: number, limit: number) => ({
    skip: (page - 1) * limit,
    take: limit,
});

export const paginate = <T>(items: T[], total: number, page: number, limit: number): Paged<T> => ({
    items,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
});