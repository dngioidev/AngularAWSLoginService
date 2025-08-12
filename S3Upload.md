# S3 Secure File Upload & Download Workflow

This document outlines the complete business and technical workflow for securely uploading, processing, and retrieving files using AWS S3 and Cognito.

The architecture is designed around a core security principle: **the frontend (client application) never handles long-term AWS credentials**. Instead, it authenticates users through Amazon Cognito and receives temporary, short-lived credentials to interact directly with S3.

## High-Level Business Workflow

1. **File Upload & Metadata Tagging**: A user uploads a file through the client application. The application attaches specific metadata based on the upload's purpose. This is a critical step for the automated processing logic.
    
    - **Action Enum**: A metadata key `action` is used to define the file type. It can be one of the following: `['quotation', 'job', 'report']`.
        
    - **Scenario-Based Metadata**:
        
        - **For Quotations (`action: 'quotation'`)**:
            
            - `project_id`: The identifier for the project.
                
            - `user_id`: The ID of the user uploading the quotation.
                
        - **For Job Images (`action: 'job'`)**:
            
            - `job_id`: The identifier for the specific job.
                
            - `user_id`: The ID of the user uploading the image.
                
        - **For Report Images (`action: 'report'`)**:
            
            - `report_id`: The identifier for the specific report.
                
            - `user_id`: The ID of the user uploading the image.
                
2. **Initial Storage**: The original, unprocessed file is securely uploaded with its metadata to a designated `originals/` folder in the S3 bucket.
    
3. **Automated Processing**: The upload to S3 triggers an AWS Lambda function. This function automatically:
    
    - Reads the file's metadata (e.g., `action`, `project_id`, `job_id`).
        
    - Performs necessary processing, such as creating a compressed version, a thumbnail, or extracting data from a sheet.
        
    - Saves the processed files into appropriate destination folders (`compress/`, `thumbnails/`, `results/`) using the metadata to construct the correct path.
        
4. **File Retrieval**: When a user needs to view a file, the application retrieves the appropriate version (e.g., a thumbnail or the processed file) from S3.
    

## Automated File Processing and Path Logic

This section details how files are routed and processed after the initial upload.

1. **Upload to Originals**: All files are initially uploaded to the `originals/` path.
    
    - **Example Upload Path**: originals/report-figure-1.png`
        
2. **Lambda Trigger**: An S3 event notification on the `originals/` prefix triggers a Lambda function whenever a new object is created.
    
3. **Processing and Distribution**: The Lambda function inspects the object's metadata to determine the correct destination path. It then generates processed versions and saves them to their final locations.
    

#### Path Logic Examples:

- **Scenario: Importing a Quotation (Sheet File)**
    
    - **Initial Upload Path**: `originals/quote-abc.xlsx`
        
    - **Metadata**: `x-amz-meta-action: quotation`, `x-amz-meta-project_id: proj-123`
        
    - **Lambda Action**: The function parses the sheet file (e.g., .xlsx) to extract structured data. The original file remains in the `originals` folder.
        
    - **Processed Path (for GET requests)**:
        
        - **Processed Data**: `results/proj-123/quote-abc.xlsx`
            
- **Scenario: Uploading a Job Image**
    
    - **Initial Upload Path**: `originals/job-image-xyz.jpg`
        
    - **Metadata**: `x-amz-meta-action: job`, `x-amz-meta-job_id: job-456`, `x-amz-meta-project_id: proj-123`
        
    - **Processed Paths (for GET requests)**:
        
        - **Compressed**: `compress/proj-123/job-456/job-image-xyz.jpg`
            
        - **Thumbnail**: `thumbnails/proj-123/job-456/job-image-xyz.jpg`
            
- **Scenario: Uploading a Report Image**
    
    - **Initial Upload Path**: `originals/report-img-1.png`
        
    - **Metadata**: `x-amz-meta-action: report`, `x-amz-meta-report_id: report-789`, `x-amz-meta-project_id: proj-123`
        
    - **Processed Paths (for GET requests)**:
        
        - **Compressed**: `compress/proj-123/report-789/report-img-1.png`
            
        - **Thumbnail**: `thumbnails/proj-123/report-789/report-img-1.png`
            

## Authentication and Authorization Flow

### Step 1: User Authentication with Cognito User Pools

The process begins with the user logging into the application. The application uses the OAuth 2.0 Authorization Code flow to authenticate the user against the Amazon Cognito User Pool.

#### Request Information (OAuth 2.0)

|   |   |
|---|---|
|**Key**|**Value**|
|**Grant Type**|`Authorization Code`|
|**Auth URL**|`https://ap-southeast-1fsb4d1w9i.auth.ap-southeast-1.amazoncognito.com/oauth2/authorize`|
|**Access Token URL**|`https://ap-southeast-1fsb4d1w9i.auth.ap-southeast-1.amazoncognito.com/oauth2/token`|
|**Client ID**|`2vqureon3g6iak37keaejsc9sf`|
|**Client Secret**|`kdkokn4jemp7923pkf8chnvudmlvqhkmkkpki4lmhvgjdffui5c`|
|**Scope**|`openid`|
|**Callback URL**|FE domain|
|**Client Authentication**|Send as Basic Auth header|

#### Successful Authentication Response

Upon successful login, Cognito provides a set of tokens. The **`id_token`** is essential for the next step.

|   |   |
|---|---|
|**Key**|**Value**|
|**id_token**|`eyJraWQiOi...` (JWT)|
|**access_token**|`eyJraWQiOi...` (JWT)|
|**refresh_token**|`eyJjdHkiOi...` (JWT)|
|**expires_in**|`3600`|
|**token_type**|`Bearer`|

### Step 2: Get Temporary AWS Credentials from Cognito Identity Pools

The application exchanges the `id_token` for temporary, limited-privilege AWS credentials. This is the crucial step that avoids exposing long-term keys to the client.

#### API Call: `GetCredentialsForIdentity`

- **URL**: `https://cognito-identity.ap-southeast-1.amazonaws.com`
    
- **Method**: `POST`
    
- **Headers**:
    
    - `Content-Type`: `application/x-amz-json-1.1`
        
    - `X-Amz-Target`: `AWSCognitoIdentityService.GetCredentialsForIdentity`
        

#### Request Body

```
{
    "IdentityId": "ap-southeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "Logins": {
        "cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_FSB4D1W9I": "<The id_token from Step 1>"
    }
}
```

#### Response: Temporary Credentials

The response contains the credentials needed for S3 operations.

```
{
    "Credentials": {
        "AccessKeyId": "ASIAXXXXXXXXXXXXXXXX",
        "SecretKey": "<secret-key>",
        "SessionToken": "<session-token>",
        "Expiration": 1749101564000
    },
    "IdentityId": "ap-southeast-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

## Step 3: S3 API Operations

The frontend application can now use the temporary credentials from Step 2 to make signed API calls directly to Amazon S3.

### A. Upload File (`PUT`)

#### API Call

- **URL**: `s3DomainName/{path}`
    
- **Method**: `PUT`
    
- **Example**: `https://your-bucket-name.s3.ap-southeast-1.amazonaws.com/originals/Gtest.jpg`
    

#### Request Data

- **Authorization**: `AWS Signature`
    
    - The request must be signed using the credentials from Step 2.
        
    - **Crucially, the `SessionToken` must be included as the `x-amz-security-token` header.**
        
    - The scenario-specific metadata (`action`, `project_id`, etc.) must be included as `x-amz-meta-*` headers.
        

|   |   |
|---|---|
|**Key**|**Value (from Step 2 Credentials)**|
|**AccessKey**|`ASIAXXXXXXXXXXXXXXXX`|
|**SecretKey**|`<secret-key>`|
|**AWS Region**|`ap-southeast-1`|
|**Service Name**|`s3`|
|**Session Token**|`<session-token>`|

- **Request Body**:
    
    - **Type**: `binary`
        
    - **Data**: The file to be uploaded.
        

#### **Upload Examples**

Below are examples of the headers required for each upload scenario. These are in addition to the standard AWS Signature V4 authorization headers.

**Example 1: Uploading a Quotation**

```
PUT /originals/quotation-q4-2025.xlsx HTTP/1.1
Host: your-bucket-name.s3.ap-southeast-1.amazonaws.com
x-amz-security-token: <SessionToken_from_Step_2>
x-amz-meta-action: quotation
x-amz-meta-project_id: proj-alpha-789
x-amz-meta-user_id: user-101

[...file binary data...]
```

**Example 2: Uploading an Image for a Job**

```
PUT /originals/job-image-onsite.jpg HTTP/1.1
Host: your-bucket-name.s3.ap-southeast-1.amazonaws.com
x-amz-security-token: <SessionToken_from_Step_2>
x-amz-meta-action: job
x-amz-meta-job_id: job-beta-456
x-amz-meta-user_id: user-102

[...file binary data...]
```

**Example 3: Uploading an Image for a Report**

```
PUT /originals/report-figure-1.png HTTP/1.1
Host: your-bucket-name.s3.ap-southeast-1.amazonaws.com
x-amz-security-token: <SessionToken_from_Step_2>
x-amz-meta-action: report
x-amz-meta-report_id: report-gamma-112
x-amz-meta-user_id: user-103

[...file binary data...]
```

### B. Get Image/File (`GET`)

#### API Call

- **URL**: `s3DomainName/{path}`
    
- **Method**: `GET`
    
- **Example**: `https://your-bucket-name.s3.ap-southeast-1.amazonaws.com/results/proj-alpha-789/quotation-q4-2025.json`
    

#### Request Data

- **Authorization**: `AWS Signature`
    
    - The `GET` request is signed using the same temporary credentials and process as the `PUT` request, including the `SessionToken` in the `x-amz-security-token` header.
        
    - **Note**: The initial documentation mentioning a "public access key" is superseded by this more secure, standard approach. The backend does **not** provide separate keys; the frontend uses the temporary credentials it fetches from Cognito.