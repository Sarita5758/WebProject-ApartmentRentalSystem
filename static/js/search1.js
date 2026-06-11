document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const apartments = document.querySelectorAll('.apartment-card');
    const resultsMessage = document.getElementById('results-message');

    searchInput.addEventListener('input', function () {
        const query = searchInput.value.toLowerCase();
        let found = false;

        apartments.forEach(function (apt) {
            const text = apt.textContent.toLowerCase();
            if (text.includes(query)) {
                apt.style.display = '';
                found = true;
            } else {
                apt.style.display = 'none';
            }
        });

        if (query === '') {
            resultsMessage.innerHTML = 'Start typing to search apartments...';
            resultsMessage.style.color = 'grey';
        } else if (!found) {
            resultsMessage.innerHTML = 'No matching apartments found.';
            resultsMessage.style.color = 'red';
        } else {
            resultsMessage.innerHTML = '';
        }
    });
});
