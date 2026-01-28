pipeline{
    agent any
    stages{
        stage ('Checkout Code'){
            steps{
                checkout scm
            }
        }
        
        stage('Prepare'){
            agent none
            steps{
                  withCredentials([file(credentialsId: 'backend-env', variable: 'ENV_FILE')]) {
                    sh '''
                    # cp $ENV_FILE .env
                    docker compose up postgres redis -d
                    cat .env      
                    '''
                }
            }
        }
        stage('Build'){
            agent{
                docker{
                    image "node:22-slim"
                    args '--network=dev-network'
                }
            }
            when{
                branch 'add-jenkins-ci/cd'
            }
            steps{
               withCredentials([file(credentialsId: 'backend-env', variable: 'ENV_FILE')]) {
                    sh '''
                    cp $ENV_FILE .env
                    npm install
                    npx prisma generate
                    npx prisma migrate dev
                    '''
                }
            }
        }
        stage('Test'){
            steps{
                echo 'Testing...'
            }
        }
        
    }
    post{
        always{
            sh 'docker compose down'
        }
    }
}