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
                sh "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} ."
            }
        }
        
        stage('Push to Registry (AWS ECR)') {
            steps {
                echo "Pushing to AWS..."
               
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
