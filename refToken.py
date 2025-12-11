import os
import subprocess
import sys

def load_env_file(filepath):
    """
    Manually parse .env file to avoid external dependencies.
    Returns a dictionary of key-value pairs.
    """
    env_vars = {}
    try:
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    except FileNotFoundError:
        print(f"[ERROR] .env file not found at {filepath}")
        return None
    return env_vars

def main():
    # 1. Locate and parse .env
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '.env')
    
    env_vars = load_env_file(env_path)
    if not env_vars:
        print("Create a .env file with at least AWS_PROFILE and AWS_REGION")
        sys.exit(1)

    aws_profile = env_vars.get('AWS_PROFILE')
    aws_region = env_vars.get('AWS_REGION')

    if not aws_profile:
        print("[ERROR] AWS_PROFILE not set in .env")
        sys.exit(1)
    
    if not aws_region:
        print("[ERROR] AWS_REGION not set in .env")
        sys.exit(1)

    print(f"Using profile {aws_profile} and region {aws_region}")
    print("Checking AWS credentials...")

    # 2. Check current identity
    try:
        # Redirect output to null to keep it clean, we only care about return code
        subprocess.check_call(
            ["aws", "sts", "get-caller-identity"], 
            stdout=subprocess.DEVNULL, 
            stderr=subprocess.DEVNULL,
            shell=True
        )
        print("Credentials are valid.")
        sys.exit(0)
    except subprocess.CalledProcessError:
        print("Credentials missing or expired. Running aws sso login ...")

    # 3. Login if needed
    try:
        subprocess.check_call(
            ["aws", "sso", "login", "--profile", aws_profile],
            shell=True
        )
        print("AWS tokens refreshed successfully")
        sys.exit(0)
    except subprocess.CalledProcessError:
        print("[ERROR] aws sso login failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
