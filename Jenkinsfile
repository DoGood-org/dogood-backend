pipeline{
    agent docker{
        image "node:22-slim"
        label "docker-nodejs"
    }
    when{
        branch 'add-jenkins-ci/cd'
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