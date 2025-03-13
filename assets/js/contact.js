/**
 * SUBE Academia - Contact Form Handler
 * This script handles the contact form submission and validation
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get the contact form element
    const contactForm = document.getElementById('contactForm');
    
    // Only proceed if the contact form exists on the page
    if (contactForm) {
        // Add submit event listener to the form
        contactForm.addEventListener('submit', function(event) {
            // Prevent the default form submission
            event.preventDefault();
            
            // Check form validity using Bootstrap's validation
            if (!contactForm.checkValidity()) {
                event.stopPropagation();
                contactForm.classList.add('was-validated');
                return;
            }
            
            // If form is valid, collect the form data
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };
            
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
            
            // Hide any existing messages
            document.getElementById('submitSuccessMessage').classList.add('d-none');
            document.getElementById('submitErrorMessage').classList.add('d-none');
            
            // In a real implementation, you would send this data to a server
            // For demonstration, we'll simulate a successful submission after a delay
            setTimeout(function() {
                // Simulate successful submission
                const success = true; // In a real app, this would be based on the server response
                
                if (success) {
                    // Show success message
                    document.getElementById('submitSuccessMessage').classList.remove('d-none');
                    // Reset the form
                    contactForm.reset();
                    contactForm.classList.remove('was-validated');
                } else {
                    // Show error message
                    document.getElementById('submitErrorMessage').classList.remove('d-none');
                }
                
                // Restore button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                
                // Hide success message after 5 seconds
                if (success) {
                    setTimeout(function() {
                        document.getElementById('submitSuccessMessage').classList.add('d-none');
                    }, 5000);
                }
            }, 1500);
        });
    }
});