const API_URL = "https://script.google.com/macros/s/AKfycbzk3fELy7sIuMoFTeZKSZ9aFkRZf-dAgMYopGnpx-psw7T05cYdy6FQGtPFFY1Y3b1r/exec";

let recipes = [];
let recipeIdToDelete = null; // Dočasná proměnná pro ukládání ID k mazání

// DOM Elementy
const container = document.getElementById("recipesContainer");
const currentCategory = document.getElementById("currentCategory");
const categoryButtons = document.querySelectorAll(".category-filter, .filter-badge");
const searchInput = document.getElementById("searchInput");
const favoritesLink = document.getElementById("favoritesLink");
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

// --- DYNAMICKÉ OVLÁDÁNÍ VELIKOSTI PÍSMA ---
function changeFontSize(size) {
    const htmlEl = document.documentElement;
    htmlEl.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg');
    htmlEl.classList.add(`font-size-${size}`);
    
    localStorage.setItem('fontSize', size);
    updateFontBtnStyles(size);
}

function updateFontBtnStyles(size) {
    // Tlačítka pro desktop
    const btnSm = document.getElementById('btnFontSm');
    const btnMd = document.getElementById('btnFontMd');
    const btnLg = document.getElementById('btnFontLg');
    // Tlačítka pro mobil
    const btnSmM = document.getElementById('btnFontSmMobile');
    const btnMdM = document.getElementById('btnFontMdMobile');
    const btnLgM = document.getElementById('btnFontLgMobile');
    
    const btns = [btnSm, btnMd, btnLg, btnSmM, btnMdM, btnLgM];
    btns.forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    
    if (size === 'sm') {
        if (btnSm) btnSm.classList.add('active');
        if (btnSmM) btnSmM.classList.add('active');
    } else if (size === 'md') {
        if (btnMd) btnMd.classList.add('active');
        if (btnMdM) btnMdM.classList.add('active');
    } else if (size === 'lg') {
        if (btnLg) btnLg.classList.add('active');
        if (btnLgM) btnLgM.classList.add('active');
    }
}

function initFontSize() {
    const savedSize = localStorage.getItem('fontSize') || 'md';
    changeFontSize(savedSize);
}

// Inicializace velikosti písma
initFontSize();

// Ochrana proti XSS útokům
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

// Převod zkratek na plný název s emoji pro děti
function getFullCategoryName(cat) {
    if (!cat) return "🍳 Neznámé";
    const cleanCat = cat.trim().toUpperCase();
    switch (cleanCat) {
        case "S": return "🥞 Snídaně";
        case "P": return "🍜 Polévky";
        case "H": return "🍗 Hlavní jídla";
        case "PR": return "🥔 Přílohy";
        case "Z": return "🍰 Zákusky";
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
            <div class="col-12 text-center text-danger my-5 py-5 w-100">
                <i class="fa-solid fa-triangle-exclamation fa-3x mb-3 text-warning"></i>
                <h5 class="fw-bold">Něco se nepovedlo při stahování receptů 😢</h5>
                <p class="text-secondary small">Zkontrolujte připojení k internetu nebo zkuste stránku načíst znovu.</p>
            </div>`;
    }
}

// FUNKCE: Přidání nového receptu
if (addRecipeForm) {
    addRecipeForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById("submitBtn");
        const pinInput = document.getElementById("recipePin");

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Ukládám do kuchařky...`;

        const formCategory = document.getElementById("recipeCategory").value;
        let shortCategory = "H";
        // Rozpoznání i s emoji
        if (formCategory.includes("Snídaně")) shortCategory = "S";
        if (formCategory.includes("Polévky")) shortCategory = "P";
        if (formCategory.includes("Přílohy")) shortCategory = "PR";
        if (formCategory.includes("Zákusky")) shortCategory = "Z";

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

            showLoader("Ukládám novou dobrotu...");
            setTimeout(fetchRecipes, 1500);

        } catch (error) {
            alert("Něco se nepovedlo při ukládání.");
            console.error(error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Uložit do kuchařky`;
        }
    });
}

// FUNKCE: Spuštění procesu mazání
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

        showLoader("Mažu recept z kuchařky...");

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

// Společný loader pro UI změny (skeleton loaders)
function showLoader(text = "") {
    let html = "";
    if (text) {
        html += `
            <div class="col-12 text-center my-3 w-100 text-secondary">
                <span class="spinner-border spinner-border-sm me-2 text-warning" role="status"></span>
                <span class="fw-bold">${text}</span>
            </div>`;
    }
    html += `
        <div class="col">
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line" style="width: 45%; height: 14px;"></div>
                    <div class="skeleton-line" style="width: 80%; height: 20px;"></div>
                    <div class="skeleton-line" style="width: 100%; height: 35px; margin-top: auto;"></div>
                </div>
            </div>
        </div>
        <div class="col">
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line" style="width: 35%; height: 14px;"></div>
                    <div class="skeleton-line" style="width: 70%; height: 20px;"></div>
                    <div class="skeleton-line" style="width: 100%; height: 35px; margin-top: auto;"></div>
                </div>
            </div>
        </div>
        <div class="col">
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line" style="width: 50%; height: 14px;"></div>
                    <div class="skeleton-line" style="width: 85%; height: 20px;"></div>
                    <div class="skeleton-line" style="width: 100%; height: 35px; margin-top: auto;"></div>
                </div>
            </div>
        </div>
        <div class="col">
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-body">
                    <div class="skeleton-line" style="width: 40%; height: 14px;"></div>
                    <div class="skeleton-line" style="width: 75%; height: 20px;"></div>
                    <div class="skeleton-line" style="width: 100%; height: 35px; margin-top: auto;"></div>
                </div>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

// FUNKCE: Vytvoření karty receptu (rodinný a přístupný vzhled)
function createCard(recipe) {
    const isFavorite = favorites.includes(Number(recipe.id));
    const isInQueue = printQueue.some(r => Number(r.id) === Number(recipe.id));
    const fullCategory = getFullCategoryName(recipe.category);

    return `
        <div class="col">
            <div class="recipe-card position-relative">
                <button class="delete-btn-overlay" onclick="openDeleteModal(${recipe.id})" title="Smazat recept">
                    <i class="fa-solid fa-trash-can text-danger me-1"></i> Smazat
                </button>
                
                <button class="print-btn-overlay ${isInQueue ? 'btn-warning' : ''}" onclick="togglePrintQueue(${recipe.id}, event)" id="btnPrint-${recipe.id}" title="${isInQueue ? 'Odebrat z tisku' : 'Přidat k tisku'}">
                    <i class="fa-solid fa-print me-1"></i> ${isInQueue ? 'Ve frontě' : 'K tisku'}
                </button>
                
                <div class="img-wrapper">
                    <img src="${recipe.image}" alt="${recipe.title}" loading="lazy">
                </div>
                
                <div class="card-body-custom">
                    <div>
                        <span class="recipe-badge">${fullCategory}</span>
                        <h6 class="recipe-title" title="${recipe.title}">${recipe.title}</h6>
                    </div>
                    <div class="d-flex gap-2 mt-auto">
                        <a href="recipe.html?id=${recipe.id}" class="recipe-link-btn flex-grow-1">
                            📖 Vařit recept
                        </a>
                        <button class="favorite-btn-card ${isFavorite ? "btn-danger" : ""}" data-id="${recipe.id}" title="${isFavorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}">
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
        if (btn) { 
            btn.classList.remove('btn-warning'); 
            btn.innerHTML = `<i class="fa-solid fa-print me-1"></i> K tisku`;
        }
    } else {
        printQueue.push(recipe);
        if (btn) { 
            btn.classList.add('btn-warning'); 
            btn.innerHTML = `<i class="fa-solid fa-print me-1"></i> Ve frontě`;
        }
    }

    localStorage.setItem("printQueue", JSON.stringify(printQueue));
    updatePrintNavButton();
}

function updatePrintNavButton() {
    const printNavBtn = document.getElementById("printNavBtn");
    const printNavBtnMobile = document.getElementById("printNavBtnMobile");
    const clearPrintBtn = document.getElementById("clearPrintBtn");
    const clearPrintBtnMobile = document.getElementById("clearPrintBtnMobile");
    const count = printQueue.length;

    if (count > 0) {
        if (printNavBtn) {
            printNavBtn.innerHTML = `<i class="fa-solid fa-print me-1 text-warning"></i> Tisková fronta (${count})`;
            printNavBtn.classList.remove("d-none");
        }
        if (printNavBtnMobile) {
            printNavBtnMobile.innerHTML = `<i class="fa-solid fa-print"></i> <span class="badge bg-danger rounded-circle position-absolute top-0 start-100 translate-middle" style="font-size: 9px; padding: 3px 5px;">${count}</span>`;
            printNavBtnMobile.classList.remove("d-none");
            printNavBtnMobile.style.position = "relative";
        }
        if (clearPrintBtn) clearPrintBtn.classList.remove("d-none");
        if (clearPrintBtnMobile) clearPrintBtnMobile.classList.remove("d-none");
    } else {
        if (printNavBtn) printNavBtn.classList.add("d-none");
        if (printNavBtnMobile) printNavBtnMobile.classList.add("d-none");
        if (clearPrintBtn) clearPrintBtn.classList.add("d-none");
        if (clearPrintBtnMobile) clearPrintBtnMobile.classList.add("d-none");
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
                btn.innerHTML = `<i class="fa-solid fa-print me-1"></i> K tisku`;
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
        
        // Zohlednění emoji ve filtrech
        const cleanSelected = selectedCategory.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim().toUpperCase();
        const cleanRecipeCat = fullCategory.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim().toUpperCase();
        
        const matchesCategory = selectedCategory === "all" || 
                                recipe.category === selectedCategory || 
                                cleanRecipeCat.includes(cleanSelected) ||
                                fullCategory.includes(selectedCategory);
                                
        const matchesFavorites = !showOnlyFavorites || favorites.includes(Number(recipe.id));

        return matchesSearch && matchesCategory && matchesFavorites;
    });

    renderRecipes(filtered);
}

function renderRecipes(recipesToRender) {
    container.innerHTML = "";

    if (recipesToRender.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted my-5 py-5 w-100">
                <i class="fa-solid fa-utensils fa-3x mb-3 text-secondary"></i>
                <h5 class="fw-bold">Nebylo nic nalezeno 🍳</h5>
                <p class="text-secondary small">Zkuste vyhledat jiné slovo nebo změnit filtr.</p>
            </div>`;
        return;
    }

    let htmlContent = "";
    recipesToRender.forEach(recipe => {
        htmlContent += createCard(recipe);
    });
    container.innerHTML = htmlContent;

    // Připojení event listenerů k tlačítkům oblíbené
    document.querySelectorAll(".recipe-card .favorite-btn-card").forEach(button => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            const recipeId = Number(button.dataset.id);

            if (favorites.includes(recipeId)) {
                favorites = favorites.filter(id => id !== recipeId);
                button.classList.remove("btn-danger");
            } else {
                favorites.push(recipeId);
                button.classList.add("btn-danger");
            }

            saveFavorites();
            
            if (showOnlyFavorites) {
                filterRecipes();
            }
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
            currentCategory.textContent = "Oblíbené recepty ❤️";
        } else {
            showOnlyFavorites = false;
            selectedCategory = cat;
            
            // Název filtru
            let displayCat = button.textContent.trim();
            currentCategory.textContent = cat === "all" ? "Všechny recepty 🍳" : displayCat;
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
        currentCategory.textContent = "Oblíbené recepty ❤️";
        
        categoryButtons.forEach(btn => {
            if(btn.id === "mobileFavoritesBtn") btn.classList.add("active-category", "active");
            else btn.classList.remove("active-category", "active");
        });

        filterRecipes();
        closeMobileNavbar();
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