document.addEventListener('DOMContentLoaded', () => {
    const userCountElement = document.getElementById('user-count');
    const orderCountElement = document.getElementById('order-count');
    const addUserForm = document.getElementById('add-user-form');

    // Fetch and display the number of users
    fetch('http://localhost:3000/dashboard/users/count')
        .then(response => response.json())
        .then(data => {
            userCountElement.textContent = data.count;
        });

    // Fetch and display the number of orders
    fetch('http://localhost:3000/dashboard/orders/count')
        .then(response => response.json())
        .then(data => {
            orderCountElement.textContent = data.count;
        });

    // Handle add user form submission
    addUserForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(addUserForm);
        const userData = {
            firstname: formData.get('firstname'),
            lastname: formData.get('lastname'),
            email: formData.get('email'),
        };

        fetch('http://localhost:3000/dashboard/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        })
        .then(response => response.json())
        .then(data => {
            console.log('User added:', data);
            // Optionally, refresh the user count
            return fetch('http://localhost:3000/dashboard/users/count')
        })
        .then(response => response.json())
        .then(data => {
            userCountElement.textContent = data.count;
        })
        .catch(error => console.error('Error:', error));
    });
});
