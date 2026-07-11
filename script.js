const API_URL = "https://script.google.com/macros/s/AKfycbzk3fELy7sIuMoFTeZKSZ9aFkRZf-dAgMYopGnpx-psw7T05cYdy6FQGtPFFY1Y3b1r/exec";

let recipes = [];
let recipeIdToDelete = null; // Dočasná proměnná pro ukládání ID k mazání

// DOM Elementy
const container = document.getElementById("recipesContainer");
const currentCategory = document.getElementById("currentCategory");
const categoryButtons = document.querySelectorAll(".category-filter, .filter-badge");
const searchInput = document.getElementById("searchInput");
const favoritesLink = document.getElementById("favoritesLink");
const mobileFavNav = document.getElementById("mobileFavNav");
const mobileHomeNav = document.getElementById("mobileHomeNav");
const addRecipeForm = document.getElementById("addRecipeForm");
const deleteRecipeForm = document.getElementById("deleteRecipeForm");

// Bootstrap instance
const navbarCollapse = document.getElementById('navbarSupportedContent');
const bsCollapse = navbarCollapse ? new bootstrap.Collapse(navbarCollapse, { toggle: false }) : null;
const addModalEl = document.getElementById('addRecipeModal');
const deleteModalEl = document.getElementById('deletePinModal');

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let printQueue = JSON.parse(localStorage.getItem("printQueue")) || [];
let selectedCategory = "all";
let showOnlyFavorites = false;

// Ochrana proti XSS útokům (zneškodní nebezpečné HTML znaky)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
        switch (m) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#039;';
            default: return m;
        }
    });
}

function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(favorites));
}

function closeMobileNavbar() {
    if (window.innerWidth < 992 && navbarCollapse && navbarCollapse.classList.contains('show')) {
        bsCollapse.hide();
    }
}

// Převod zkratek na plný název
function getFullCategoryName(cat) {
    if (!cat) return "Neznámé";
    const cleanCat = cat.trim().toUpperCase();
    switch (cleanCat) {
        case "S": return "Snídaně";
        case "P": return "Polévky";
        case "H": return "Hlavní jídla";
        case "PR": return "Přílohy";
        case "Z": return "Zákusky";
        default: return cat;
    }
}

// FUNKCE: Načtení receptů z Google Sheets
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

// FUNKCE: Přidání nového receptu
if (addRecipeForm) {
    addRecipeForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById("submitBtn");
        const btnText = document.getElementById("btnText");
        const pinInput = document.getElementById("recipePin");

        submitBtn.disabled = true;
        btnText.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Ukládám...`;

        const formCategory = document.getElementById("recipeCategory").value;
        let shortCategory = "H";
        if (formCategory === "Snídaně") shortCategory = "S";
        if (formCategory === "Polévky") shortCategory = "P";
        if (formCategory === "Přílohy") shortCategory = "PR";
        if (formCategory === "Zákusky") shortCategory = "Z";

        const newRecipe = {
            action: "ADD",
            title: escapeHTML(document.getElementById("recipeTitle").value),
            category: shortCategory,
            image: encodeURI(document.getElementById("recipeImage").value),
            ingredients: escapeHTML(document.getElementById("recipeIngredients").value),
            instructions: escapeHTML(document.getElementById("recipeInstructions").value),
            pin: pinInput.value
        };

        try {
            await fetch(API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRecipe)
            });

            addRecipeForm.reset();
            const modalInstance = bootstrap.Modal.getOrCreateInstance(addModalEl);
            modalInstance.hide();

            showLoader("Aktualizuji kuchařku...");
            setTimeout(fetchRecipes, 1500);

        } catch (error) {
            alert("Něco se nepovedlo při ukládání.");
            console.error(error);
        } finally {
            submitBtn.disabled = false;
            btnText.innerText = "Uložit do kuchařky";
        }
    });
}

// FUNKCE: Spuštění procesu mazání (otevře elegantní modal místo promptu)
function openDeleteModal(id) {
    recipeIdToDelete = id;
    const pinInput = document.getElementById("deletePinInput");
    if (pinInput) pinInput.value = ""; // Vyčistit minulé zadání
    
    const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
    deleteModal.show();
}

// FUNKCE: Odeslání požadavku na smazání z modálu
if (deleteRecipeForm) {
    deleteRecipeForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!recipeIdToDelete) return;

        const pinInput = document.getElementById("deletePinInput");
        const submitBtn = document.getElementById("deleteSubmitBtn");
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

        // Zavřeme ihned modal
        const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
        deleteModal.hide();

        showLoader("Mažu recept...");

        try {
            await fetch(API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "DELETE",
                    id: recipeIdToDelete,
                    pin: pinInput.value
                })
            });
            recipeIdToDelete = null;
            setTimeout(fetchRecipes, 1500);
        } catch (error) {
            alert("Chyba při komunikaci se serverem.");
            console.error(error);
            fetchRecipes();
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Potvrdit";
        }
    });
}

// Společný loader pro UI změny
function showLoader(text) {
    container.innerHTML = `
        <div class="col-12 text-center my-5 w-100">
            <div class="spinner-border text-danger" role="status"></div>
            <p class="mt-2 text-muted">${text}</p>
        </div>`;
}

// FUNKCE: Vytvoření karty receptu
function createCard(recipe) {
    const isFavorite = favorites.includes(Number(recipe.id));
    const isInQueue = printQueue.some(r => Number(r.id) === Number(recipe.id));
    const fullCategory = getFullCategoryName(recipe.category);

    return `
        <div class="col">
            <div class="card h-100 d-flex flex-column position-relative recipe-card border-0 shadow-sm overflow-hidden">
                <button class="btn delete-btn-overlay" onclick="openDeleteModal(${recipe.id})" title="Smazat recept">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                
                <button class="btn ${isInQueue ? 'btn-warning' : ''} print-btn-overlay" onclick="togglePrintQueue(${recipe.id}, event)" id="btnPrint-${recipe.id}" title="Přidat do tisku">
                    <i class="fa-solid fa-print"></i>
                </button>
                
                <div class="img-wrapper" style="aspect-ratio: 4/3; overflow: hidden; position: relative;">
                    <img src="${recipe.image}" class="card-img-top h-100 w-100" style="object-fit: cover;" alt="${recipe.title}" loading="lazy">
                </div>
                <div class="card-body p-3 d-flex flex-column justify-content-between">
                    <div>
                        <span class="badge bg-light text-muted border mb-2 small d-inline-block fw-semibold text-uppercase" style="font-size: 10px; padding: 4px 8px;">${fullCategory}</span>
                        <h6 class="card-title fw-bold text-dark mb-3" style="font-size: 15px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 42px;">${recipe.title}</h6>
                    </div>
                    <div class="d-flex gap-2 mt-2">
                        <a href="recipe.html?id=${recipe.id}" class="btn btn-outline-secondary btn-sm flex-grow-1 d-flex align-items-center justify-content-center py-2 fw-semibold" style="border-radius: var(--radius-sm); font-size: 13px;">
                            Recept
                        </a>
                        <button class="btn ${isFavorite ? "btn-danger text-white border-danger" : "btn-outline-danger"} btn-sm favorite-btn px-3 d-flex align-items-center justify-content-center" data-id="${recipe.id}" style="border-radius: var(--radius-sm);">
                            <i class="fa-solid fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// FUNKCE: Tisková fronta
function togglePrintQueue(id, event) {
    if (event) event.stopPropagation();

    const recipe = recipes.find(r => Number(r.id) === Number(id));
    if (!recipe) return;

    const index = printQueue.findIndex(r => Number(r.id) === Number(id));
    const btn = document.getElementById(`btnPrint-${id}`);

    if (index > -1) {
        printQueue.splice(index, 1);
        if (btn) { btn.classList.remove('btn-warning'); }
    } else {
        printQueue.push(recipe);
        if (btn) { btn.classList.add('btn-warning'); }
    }

    localStorage.setItem("printQueue", JSON.stringify(printQueue));
    updatePrintNavButton();
}

function updatePrintNavButton() {
    const printNavBtn = document.getElementById("printNavBtn");
    const clearPrintBtn = document.getElementById("clearPrintBtn");
    const mobilePrintBadge = document.getElementById("mobilePrintBadge");
    const count = printQueue.length;

    if (count > 0) {
        if (printNavBtn) {
            printNavBtn.innerHTML = `<i class="fa-solid fa-print me-1"></i> Tisková fronta (${count})`;
            printNavBtn.classList.remove("d-none");
        }
        if (mobilePrintBadge) {
            mobilePrintBadge.innerText = count;
            mobilePrintBadge.style.display = "inline-block";
        }
        if (clearPrintBtn) clearPrintBtn.classList.remove("d-none");
    } else {
        if (printNavBtn) printNavBtn.classList.add("d-none");
        if (mobilePrintBadge) {
            mobilePrintBadge.style.display = "none";
        }
        if (clearPrintBtn) clearPrintBtn.classList.add("d-none");
    }
}

// FUNKCE: Kompletní vyčištění tiskové fronty naráz
function clearPrintQueue() {
    if (printQueue.length === 0) return;
    
    if (confirm("Opravdu chcete vyčistit celou tiskovou frontu?")) {
        printQueue.forEach(recipe => {
            const btn = document.getElementById(`btnPrint-${recipe.id}`);
            if (btn) {
                btn.classList.remove('btn-warning');
            }
        });

        printQueue = [];
        localStorage.setItem("printQueue", JSON.stringify(printQueue));
        updatePrintNavButton();
    }
}

// FUNKCE: Filtrování dat
function filterRecipes() {
    const searchValue = normalizeText(searchInput.value);

    const filtered = recipes.filter(recipe => {
        const matchesSearch = normalizeText(recipe.title).includes(searchValue);
        const fullCategory = getFullCategoryName(recipe.category);
        const matchesCategory = selectedCategory === "all" || recipe.category === selectedCategory || fullCategory === selectedCategory;
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

    document.querySelectorAll(".recipe-card .favorite-btn").forEach(button => {
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
    updatePrintNavButton();
}

function normalizeText(text) {
    return text ? text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
}

// Obsluha kliknutí na filtry
categoryButtons.forEach(button => {
    button.addEventListener("click", e => {
        e.preventDefault();
        const cat = button.dataset.category;
        
        if (cat === "favorites") {
            showOnlyFavorites = true;
            selectedCategory = "all";
            currentCategory.textContent = "Oblíbené recepty";
            if (mobileFavNav) mobileFavNav.classList.add("active");
            if (mobileHomeNav) mobileHomeNav.classList.remove("active");
        } else {
            showOnlyFavorites = false;
            selectedCategory = cat;
            currentCategory.textContent = selectedCategory === "all" ? "Všechny recepty" : selectedCategory;
            if (mobileHomeNav) {
                if (cat === "all") mobileHomeNav.classList.add("active");
                else mobileHomeNav.classList.remove("active");
            }
            if (mobileFavNav) mobileFavNav.classList.remove("active");
        }

        categoryButtons.forEach(btn => {
            if (btn.dataset.category === cat) {
                btn.classList.add("active-category", "active");
            } else {
                btn.classList.remove("active-category", "active");
            }
        });

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
        if (mobileFavNav) mobileFavNav.classList.add("active");
        if (mobileHomeNav) mobileHomeNav.classList.remove("active");
        
        categoryButtons.forEach(btn => {
            if(btn.id === "mobileFavoritesBtn") btn.classList.add("active-category", "active");
            else btn.classList.remove("active-category", "active");
        });

        filterRecipes();
        closeMobileNavbar();
    });
}

if (mobileFavNav) {
    mobileFavNav.addEventListener("click", e => {
        e.preventDefault();
        showOnlyFavorites = true;
        selectedCategory = "all";
        currentCategory.textContent = "Oblíbené recepty";
        mobileFavNav.classList.add("active");
        if (mobileHomeNav) mobileHomeNav.classList.remove("active");

        categoryButtons.forEach(btn => {
            if(btn.id === "mobileFavoritesBtn") btn.classList.add("active-category", "active");
            else btn.classList.remove("active-category", "active");
        });

        filterRecipes();
    });
}

// Spuštění
fetchRecipes();

// Ochrana PIN políček proti zahlcení a zadání více než 4 čísel
const pinInputs = [document.getElementById("recipePin"), document.getElementById("deletePinInput")];

pinInputs.forEach(input => {
    if (input) {
        input.addEventListener("input", (e) => {
            // Nahradí cokoliv, co není číslo, prázdným znakem
            let value = e.target.value.replace(/\D/g, "");
            
            // Pokud je řetězec delší než 4 znaky, nekompromisně ho ořízne
            if (value.length > 4) {
                value = value.slice(0, 4);
            }
            
            e.target.value = value;
        });
    }
});