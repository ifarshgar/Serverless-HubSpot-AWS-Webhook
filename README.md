# Serverless HubSpot AWS Web Hook

This project is a Node.js application designed to handle webhooks between HubSpot and AWS services. 
It facilitates seamless communication and processes data effectively for a specific usecase. 
However, it can be used as a formidable base to develop further functionalities. 

## Features

- **Webhook Integration**: Easily connect HubSpot events with AWS services.
- **Reliable**: Built with a focus on scalability and reliability.
- **Customizable**: Modify to suit specific use cases or workflows.

## Prerequisites

Before running this project, ensure you have the following installed:

1. **Node.js** (v14.x or later)
2. **AWS Account** with necessary permissions
3. **HubSpot Account** with webhook configurations enabled

## Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:ifarshgar/HubSpot-AWS-Webhook.git
   cd HubSpot-AWS-Webhook
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Set up environment variables:
   - Create a `.env` file in the project directory.
   - Add necessary configurations, such as:
     ```
     HUBSPOT_API_KEY=your_hubspot_api_key
     AWS_REGION=your_aws_region
     ```

2. Configure your HubSpot webhook to point to the endpoint provided by this application.

3. Ensure your AWS services (e.g., Lambda, S3, DynamoDB) are properly configured.

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Verify the server is running:
   - Open a browser or tool like Postman and test the endpoint.

3. Monitor and process incoming webhook events from HubSpot.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes and push the branch:
   ```bash
   git commit -m "Description of changes"
   git push origin feature-name
   ```
4. Open a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

For questions or support, please reach out to [ifarshgar](https://github.com/ifarshgar).
```
