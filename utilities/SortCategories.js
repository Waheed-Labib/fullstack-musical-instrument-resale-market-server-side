const sortCategories = async (sortBy, categories, cursor) => {

    if (sortBy === 'name') {
        categories = await cursor.sort({ name: 1 }).toArray();
    }

    if (sortBy === 'type') {
        categories = await cursor.sort({ type: 1 }).toArray();
    }

    if (sortBy === 'region') {
        categories = await cursor.sort({ region: 1 }).toArray();
    }

    if (!sortBy) {
        categories = await cursor.toArray();
    }

    return categories
}

export default categories;