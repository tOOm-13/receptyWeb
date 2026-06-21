// Sem vlož URL svého Google Apps Scriptu!
const API_URL = "https://script.google.com/macros/s/AKfycbzk3fELy7sIuMoFTeZKSZ9aFkRZf-dAgMYopGnpx-psw7T05cYdy6FQGtPFFY1Y3b1r/exec"; 

let recipes = []; // Nyní zcela prázdné, plní se pouze ze Sheetu!

// DOM Elementy
const container = document.getElementById("recipesContainer");
const currentCategory = document.getElementById("currentCategory");
const categoryButtons = document.querySelectorAll(".category-filter");
const searchInput = document.getElementById("searchInput");
const favoritesLink = document.getElementById("favoritesLink");
const addRecipeForm = document.getElementById("addRecipeForm");

// Bootstrap instance
const navbarCollapse = document.getElementById('navbarSupportedContent');
const bsCollapse = navbarCollapse ? new bootstrap.Collapse(navbarCollapse, { toggle: false }) : null;
const addModalEl = document.getElementById('addRecipeModal');

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let selectedCategory = "all";
let showOnlyFavorites = false;

function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(favorites));
}

function closeMobileNavbar() {
    if (window.innerWidth < 992 && navbarCollapse.classList.contains('show')) {
        bsCollapse.hide();
    }
}

// 1. FUNKCE: Načtení receptů
async function fetchRecipes() {
    try {
        const response = await fetch(API_URL);
        recipes = await response.json();
        filterRecipes();
    } catch (error) {
        console.error("Chyba při načítání:", error);
        container.innerHTML = `
            <div class="col-12 text-center text-danger my-4 py-4">
                <i class="fa-solid fa-triangle-exclamation fa-2xl mb-3"></i>
                <h5>Chyba při stahování receptů.</h5>
            </div>`;
    }
}

// 2. FUNKCE: Přidání receptu
if (addRecipeForm) {
    addRecipeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById("submitBtn");
        const btnText = document.getElementById("btnText");
        
        submitBtn.disabled = true;
        btnText.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Ukládám...`;

        const newRecipe = {
            title: document.getElementById("recipeTitle").value,
            category: document.getElementById("recipeCategory").value,
            image: document.getElementById("recipeImage").value
        };

        try {
            await fetch(API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRecipe)
            });

            addRecipeForm.reset();
            const modalInstance = bootstrap.Modal.getInstance(addModalEl);
            modalInstance.hide();
            
            showLoader("Aktualizuji kuchařku...");
            setTimeout(fetchRecipes, 1500);

        } catch (error) {
            alert("Něco se nepovedlo.");
            console.error(error);
        } finally {
            submitBtn.disabled = false;
            btnText.innerText = "Uložit do kuchařky";
        }
    });
}

// 3. FUNKCE: Bezpečné smazání receptu pomocí PINu
async function deleteRecipe(id) {
    const pin = prompt("Zadej rodinný PIN kód pro smazání receptu:");
    if (!pin) return; // Uživatel stornoval zadání

    showLoader("Mažu recept...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "no-cors", // Kvůli politice Google Scriptů posíláme bez CORS, zpracování proběhne na pozadí
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "DELETE",
                id: id,
                pin: pin
            })
        });

        // Protože režim no-cors nevrací čitelnou odpověď do JS, 
        // pro jistotu hned aktualizujeme seznam z databáze, abychom viděli výsledek.
        setTimeout(fetchRecipes, 1500);

    } catch (error) {
        alert("Chyba při komunikaci se serverem.");
        console.error(error);
        fetchRecipes();
    }
}

function showLoader(text) {
    container.innerHTML = `
        <div class="col-12 text-center my-5 w-100">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">${text}</p>
        </div>`;
}

// Vylepšená karta receptu s tlačítkem smazat (koš) v horním rohu
function createCard(recipe) {
    const isFavorite = favorites.includes(Number(recipe.id));

    return `
        <div class="col">
            <div class="card h-100 shadow-sm d-flex flex-column position-relative">
                <button class="btn btn-dark btn-sm delete-btn-overlay" onclick="deleteRecipe(${recipe.id})">
                    <i class="fa-solid fa-trash-can text-danger"></i>
                </button>
                
                <img src="${recipe.image}" class="card-img-top" alt="${recipe.title}" loading="lazy">
                <div class="card-body p-2 p-md-3 d-flex flex-column justify-content-between">
                    <div>
                        <span class="badge bg-light text-dark border mb-1 small d-none d-sm-inline-block">${recipe.category}</span>
                        <h6 class="card-title fw-bold text-dark text-truncate mb-2">${recipe.title}</h6>
                    </div>
                    <div class="d-flex gap-1 mt-auto">
                        <a href="recipe.html?id=${recipe.id}" class="btn btn-outline-primary btn-sm flex-grow-1 recipe-link d-flex align-items-center justify-content-center">
                            Recept
                        </a>
                        <button class="btn ${isFavorite ? "btn-danger" : "btn-outline-danger"} btn-sm favorite-btn" data-id="${recipe.id}">
                            <i class="fa-solid fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function filterRecipes() {
    const searchValue = normalizeText(searchInput.value);

    const filtered = recipes.filter(recipe => {
        const matchesSearch = normalizeText(recipe.title).includes(searchValue);
        const matchesCategory = selectedCategory === "all" || recipe.category === selectedCategory;
        const matchesFavorites = !showOnlyFavorites || favorites.includes(Number(recipe.id));

        return matchesSearch && matchesCategory && matchesFavorites;
    });

    renderRecipes(filtered);
}

function renderRecipes(recipesToRender) {
    container.innerHTML = "";

    if (recipesToRender.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted my-4 py-4 w-100">
                <i class="fa-solid fa-utensils fa-2xl mb-3"></i>
                <h5>Nebylo nic nalezeno</h5>
            </div>`;
        return;
    }

    let htmlContent = "";
    recipesToRender.forEach(recipe => {
        htmlContent += createCard(recipe);
    });
    container.innerHTML = htmlContent;

    document.querySelectorAll(".favorite-btn").forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            const recipeId = Number(button.dataset.id);

            if (favorites.includes(recipeId)) {
                favorites = favorites.filter(id => id !== recipeId);
            } else {
                favorites.push(recipeId);
            }

            saveFavorites();
            filterRecipes();
        });
    });
}

function normalizeText(text) {
    return text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
}

categoryButtons.forEach(button => {
    button.addEventListener("click", e => {
        e.preventDefault();
        showOnlyFavorites = false;
        selectedCategory = button.dataset.category;

        currentCategory.textContent = selectedCategory === "all" ? "Všechny recepty" : selectedCategory;
        categoryButtons.forEach(btn => btn.classList.remove("active-category"));
        button.classList.add("active-category");

        filterRecipes();
        closeMobileNavbar();
    });
});

searchInput.addEventListener("input", () => {
    filterRecipes();
});

if (favoritesLink) {
    favoritesLink.addEventListener("click", e => {
        e.preventDefault();
        showOnlyFavorites = true;
        selectedCategory = "all";
        currentCategory.textContent = "Oblíbené recepty";
        categoryButtons.forEach(btn => btn.classList.remove("active-category"));

        filterRecipes();
        closeMobileNavbar();
    });
}

// Prvotní stažení dat
fetchRecipes();