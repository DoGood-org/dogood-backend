pipeline{
    agent 
    {
        docker{
            image "node:22-slim"
            label "docker-nodejs"
        }
    }
    
    stages{
        stage 'Checkout Code'{
            steps{
                checkout scm
            }
        }
        stage('Build'){
            when{
                branch 'add-jenkins-ci/cd'
            }
            steps{
                echo "Building..."
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