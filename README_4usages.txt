
1-  deploy the handler on aws and copy the url 

2- write the url of aws on js function below #AWS URL


<!-- Buttons with data attributes for different records -->
// in module deal_cards add this to codes 

<button class="hubdb-update-btn" 
        data-deal-id={{deal_id}}
        data-user-email={{ USER_EMAIL }} 
        data-flag={{ true / false get it from hubdb}}> 
  interest
</button>

example on rendered : 
<button class="hubdb-update-btn" 
        data-deal-id="deal_123" 
        data-user-email="user1@example.com" 
        data-flag="true">
  Mark Deal 123 as Complete
</button>

<div id="updateStatus"></div> -- if you want to show logs for user interest added/removed



document.querySelectorAll('.hubdb-update-btn').forEach(button => {
  button.addEventListener('click', async function() {
    // Get status element
    const statusDiv = document.getElementById('updateStatus') || document.createElement('div');
    if (!statusDiv.id) {
      statusDiv.id = 'updateStatus';
      this.parentNode.appendChild(statusDiv);
    }
    
    // Save original button state
    const originalText = this.innerHTML;
    const originalBg = this.style.backgroundColor;
    
    // Set loading state
    this.innerHTML = '<span class="spinner">↻</span> Processing...';
    this.style.backgroundColor = '#e0e0e0';
    this.disabled = true;
    statusDiv.textContent = "Sending data to HubDB...";
    statusDiv.style.color = "#1565C0";

    try {
      // Prepare payload
      const payload = {
        deal_id: this.dataset.dealId,
        deal_name: this.dataset.dealName || '',
        user_email: this.dataset.userEmail,
        user_name: this.dataset.userName || '',
        flag: this.dataset.flag === 'true',
        action_taken: this.dataset.action || originalText.trim(),
        last_updated: new Date().toISOString()
      };

      // Make API call
      const response = await fetch('https://ifashgar.com/', { // #AWS URL ater deploy
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'YOUR_API_KEY' // Add if using API gateway keys
        },
        body: JSON.stringify(payload)
      });

      // Handle response
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Update failed`);
      }

      // Success state
      statusDiv.innerHTML = `✓ Updated at ${new Date().toLocaleTimeString()}`;
      statusDiv.style.color = "#2E7D32";
      this.innerHTML = '✔ ' + originalText;
      this.style.backgroundColor = '#E8F5E9';
      setTimeout(() => {
        this.innerHTML = originalText;
        this.style.backgroundColor = originalBg;
      }, 2000);

      console.log('HubDB Update Success:', result);

    } catch (error) {
      // Error state
      statusDiv.innerHTML = `✗ Error: ${error.message}`;
      statusDiv.style.color = "#C62828";
      this.innerHTML = '✗ Try Again';
      this.style.backgroundColor = '#FFEBEE';
      console.error('Update Failed:', error, 'Payload:', payload);
      
      // Reset button after delay
      setTimeout(() => {
        this.innerHTML = originalText;
        this.style.backgroundColor = originalBg;
        this.disabled = false;
      }, 3000);
    }
  });
});
