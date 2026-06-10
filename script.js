const recipes = [
    {
        id: 1,
        title: "Česnečka",
        category: "Polévky",
        image: "https://d50-a.sdn.cz/d_50/c_img_QN_2/zZ9CA/cesnecka-polevka-cesnekova-polevka.jpeg?fl=cro,168,0,2664,1998%7Cres,1200,,1%7Cjpg,80,,1"
    },
    {
        id: 2,
        title: "Perník",
        category: "Zákusky",
        image: "https://static.toprecepty.cz/fotky/recepty/0016/nadychany-pernik-38847-670-377-nw.jpg"
    },
    {
        id: 3,
        title: "Karbenátky",
        category: "Hlavní jídla",
        image: "https://static.albert.cz/medias/sys_master/images/h73/ha9/8950413983774.jpg?buildNumber=7224a46dd6e69c0d2357dc801e1625e3358ae6f91d762dca5e4969382ef1cfa5"
    },
    {
        id: 4,
        title: "Vafle",
        category: "Snídaně",
        image: "https://cdn.myshoptet.com/usr/www.madebykristina.cz/user/documents/upload/Recepty/vafle4.jpg"
    }
];

const container = document.getElementById("recipesContainer");

let favorites =
    JSON.parse(
        localStorage.getItem("favorites")
    ) || [];

function saveFavorites() {

    localStorage.setItem(
        "favorites",
        JSON.stringify(favorites)
    );

}

function createCard(recipe) {

    const isFavorite =
        favorites.includes(recipe.id);

    return `
        <div class="col-12 col-md-6 col-lg-3">

            <div class="card h-100 shadow-sm">

                <img
                    src="${recipe.image}"
                    class="card-img-top"
                    alt="${recipe.title}"
                >

                <div class="card-body">

                    <h5 class="card-title">
                        ${recipe.title}
                    </h5>

                    <p class="card-text">
                        ${recipe.category}
                    </p>

                    <a
                        href="recipe.html?id=${recipe.id}"
                        class="btn btn-outline-primary"
                    >
                        Celý recept
                    </a>

                    <button
                        class="btn ${isFavorite
            ? "btn-danger"
            : "btn-outline-danger"
        } favorite-btn"
                        data-id="${recipe.id}"
                    >
                    <i class="fa-solid fa-heart"></i>
                    </button>

                </div>

            </div>

        </div>
    `;
}

function renderRecipes(recipesToRender) {

    container.innerHTML = "";

    recipesToRender.forEach(recipe => {

        container.innerHTML +=
            createCard(recipe);

    });

    document
        .querySelectorAll(".favorite-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                const recipeId =
                    Number(button.dataset.id);

                if (
                    favorites.includes(recipeId)
                ) {

                    favorites =
                        favorites.filter(
                            id => id !== recipeId
                        );

                } else {

                    favorites.push(recipeId);

                }

                saveFavorites();

                renderRecipes(
                    recipesToRender
                );

            });

        });

}

renderRecipes(recipes);

// Kategorie

let selectedCategory = "all";

const currentCategory =
    document.getElementById(
        "currentCategory"
    );

const categoryButtons =
    document.querySelectorAll(
        ".category-filter"
    );

categoryButtons.forEach(button => {

    button.addEventListener(
        "click",
        e => {

            e.preventDefault();

            selectedCategory =
                button.dataset.category;

            currentCategory.textContent =
                selectedCategory === "all"
                    ? "Všechny recepty"
                    : selectedCategory;

            categoryButtons.forEach(btn => {

                btn.classList.remove(
                    "active-category"
                );

            });

            button.classList.add(
                "active-category"
            );

            filterRecipes();

        }
    );

});

// Vyhledávání

const searchInput =
    document.getElementById(
        "searchInput"
    );

searchInput.addEventListener(
    "input",
    () => {

        selectedCategory = "all";

        currentCategory.textContent =
            "Všechny recepty";

        categoryButtons.forEach(btn => {

            btn.classList.remove(
                "active-category"
            );

        });

        filterRecipes();

    }
);

// Diakritika

function normalizeText(text) {

    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );

}

// Filtrování

function filterRecipes() {

    const searchValue =
        normalizeText(
            searchInput.value
        );

    const filtered =
        recipes.filter(recipe => {

            const matchesSearch =
                normalizeText(
                    recipe.title
                ).includes(
                    searchValue
                );

            const matchesCategory =
                selectedCategory ===
                "all"
                ||
                recipe.category ===
                selectedCategory;

            return (
                matchesSearch
                &&
                matchesCategory
            );

        });

    renderRecipes(filtered);

}

// Oblíbené

const favoritesLink =
    document.getElementById(
        "favoritesLink"
    );

if (favoritesLink) {

    favoritesLink.addEventListener(
        "click",
        e => {

            e.preventDefault();

            const favoriteRecipes =
                recipes.filter(
                    recipe =>
                        favorites.includes(
                            recipe.id
                        )
                );

            currentCategory.textContent =
                "Oblíbené recepty";

            renderRecipes(
                favoriteRecipes
            );

        }
    );

}