pipeline{
    agent docker
    {
        image "node:22-slim"
        label "docker-nodejs"
    }
    stages{
        stage 'Checkout Code'{
            steps{
                checkout scm
            }
        }
        stage('Build'){
            steps{
                echo "Building..."
                sh "npm install"
                sh "npx prisma generate"
                sh "npm run build"
            }
        }
        stage('Test'){
            agent{label 'tester'}
            steps{
                echo 'Testing...'
            }
        }
    }
    
}