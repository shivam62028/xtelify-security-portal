pipeline {
    agent any
    
    environment {
        IMAGE_NAME = "security-portal"
        IMAGE_TAG = "v${env.BUILD_ID}"
    }
    
    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo "Building image: ${IMAGE_NAME}:${IMAGE_TAG}"
                // The exact command you just ran manually!
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }
        
        stage('Push to Registry (AWS ECR)') {
            steps {
                echo "Pushing to AWS..."
                // This is where you will eventually push the image to the cloud
                // sh "docker push ${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }
    }
    
    post {
        success {
            echo "Pipeline completed successfully! Dashboard is ready for deployment."
        }
        failure {
            echo "Pipeline failed. Check the logs."
        }
    }
}