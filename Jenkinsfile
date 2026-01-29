pipeline{
    agent any
    stages{
        stage ('Checkout Code'){
            steps{
                checkout scm
            }
        }
        // TODO lint stage
        stage('Prepare'){
            agent none
            steps{
                  withCredentials([file(credentialsId: 'backend-env', variable: 'ENV_FILE')]) {
                    sh '''
                    rm -f .env
                    cp $ENV_FILE .env
                    docker compose up postgres redis -d    
                    '''
                }
            }
        }
        stage('Test'){
            agent{
                docker{
                    image "node:22-slim"
                    args '--network=dev-network'
                }
            }
            steps{
                // TODO implement tests
                echo 'Testing...'
            }
        }

        // TODO code quality stage
        
        stage('Build'){
            when{
                branch 'add-jenkins-ci/cd'
            }
            steps{
               withCredentials([file(credentialsId: 'backend-env', variable: 'ENV_FILE')]) {
                    sh 'docker buildx build . --tag dogood-backend:$BUILD_NUMBER --target prod --secret id=env,src=$ENV_FILE'
                }
            }
            // TODO push to registry
        }
    }
    post{
        always{
            sh 'docker compose down'
        }
        // TODO email notification
    }
}