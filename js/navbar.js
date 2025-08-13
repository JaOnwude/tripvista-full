const currentYear = document.querySelector('#currentyear');

currentYear.textContent = new Date().getFullYear();

// ===== Mobile Menu Toggle =====
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
const navBar = document.querySelector(".navbar")

hamburger.addEventListener("click", () => {
navLinks.classList.toggle("open");
navBar.classList.toggle('change-height');
});

// hamburger.addEventListener('click', () => {
// 	navigation.classList.toggle('show');
// 	hamburgerButton.classList.toggle('show');
// });