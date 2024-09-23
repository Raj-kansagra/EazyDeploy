import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config.js';

const ProjectItems = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [envDivs, setEnvDivs] = useState([{ key: '', value: '' }]);
  const [projectPath, setProjectPath] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isShowingLogs, setIsShowingLogs] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(0);
  const intervalRef = useRef(null); // Use a ref to keep track of the interval

  // Function to fetch the project details and initial deployment status
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('token');
        let {data} = await axios.get(`${API_BASE_URL}/users/projects/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setLimit(data.limit);
        data = data.project;
        setProject(data);
        const existingEnvDivs = (data.env || []).map(env => ({ key: env.key, value: env.value }));
        setEnvDivs(existingEnvDivs.length > 0 ? existingEnvDivs : [{ key: '', value: '' }]);
        setProjectPath(data.project_path || '');
        setHasChanges(false); // Reset changes when project data is fetched

        // Check deployment status if the project is already in deployment
        const deploying = await fetchDeployStatus();
        if (deploying) {
          setIsDeploying(true); // Set deploying to true if deployment is ongoing
          startPolling(); // Start polling if deployment is ongoing
        }

      } catch (error) {
        console.error('Error fetching project details:', error);
      }
    };

    fetchProject();

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id, isDeploying]);

  // Function to check deployment status
  const fetchDeployStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${API_BASE_URL}/users/projects/status/${id}`, {
        headers: {
          Authorization: `Bearer ${token}` 
        }
      });
      return data.isdeploying;
    } catch (error) {
      console.error('Error fetching deployment status:', error);
      return false; 
    }
  };

  // Function to start polling for deployment status
  const startPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current); // Clear any existing interval
    }

    intervalRef.current = setInterval(async () => {
      const deploying = await fetchDeployStatus();
      if (!deploying) {
        clearInterval(intervalRef.current); // Stop polling
        intervalRef.current = null; // Clear the ref
        setIsDeploying(false); // Deployment complete
      }
    }, 4000); // Poll every 4 seconds
  };

  const handleDeploy = async () => {
    setIsDeploying(true); 

    if(limit>0){
      try {
        await axios.patch(`${API_BASE_URL}/users/projects/status/${id}`, {}, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if(project.project_type == 'react'){
          await axios.post(`${API_BASE_URL}/users/projects/deploy-react/${id}`, {}, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
        }else{
          await axios.post(`${API_BASE_URL}/users/projects/deploy-express/${id}`, {}, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
        }
        
        startPolling();

      } catch (error) {
        console.error('Error deploying project:', error);
        alert('An error occurred. Please try again.');
      }
    }else{
      alert('you have exceeded your daily limit');
    }
    setIsDeploying(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/users/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate('/projects');
      setLoading(false);
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally{
      setLoading(false);
    }
  };

  const handleEnvChange = (index, e) => {
    const updatedEnvDivs = [...envDivs];
    updatedEnvDivs[index][e.target.name] = e.target.value;
    setEnvDivs(updatedEnvDivs);
    setHasChanges(true); // Set hasChanges to true when environment variables change
  };

  const handleToggleLogs = () => {
    setIsShowingLogs(prevState => !prevState);
  };
  
  const handleAddEnvDiv = () => {
    setEnvDivs([...envDivs, { key: '', value: '' }]);
    setHasChanges(true); // Set hasChanges to true when a new env variable is added
  };

  const handleDeleteEnvDiv = (index) => {
    const updatedEnvDivs = envDivs.filter((_, i) => i !== index);
    setEnvDivs(updatedEnvDivs);
    setHasChanges(true); // Set hasChanges to true when an env variable is deleted
  };

  const handleProjectPathChange = (e) => {
    const newPath = e.target.value;

    // Validate that the path does not start with "/"
    if (newPath.startsWith('/')) {
      setErrorMessage("Path cannot start with '/'");
    } else {
      setErrorMessage(''); // Clear error message if input is valid
      setProjectPath(newPath);
      setHasChanges(true);
    }
  };

  const handleSaveEnv = async () => {
    try {
      const validEnvDivs = envDivs.filter((envDiv) => envDiv.key && envDiv.value);
      
      await axios.patch(`${API_BASE_URL}/users/projects/${id}`, {
        env: validEnvDivs,
        project_path: projectPath
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setHasChanges(false); // Reset hasChanges after saving
    } catch (error) {
      console.error('Error saving environment variables and project path:', error);
    }
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className="project-detail">
      <h2>Project Details</h2>
      <div className="container-deploy">
        {!isShowingLogs && <button onClick={handleDeploy} className="btn deploy-btn" disabled={isDeploying}>
          {isDeploying ? 'Deploying...' : 'Deploy'}
        </button>}
        <button
          type="button"
          onClick={handleToggleLogs}
          className="btn deploy-btn"
          disabled={isDeploying}
        >
          {isShowingLogs ? 'Back' : 'Show Logs'}
        </button>
      </div>

      {isShowingLogs ? (
        <>
        <p>Please ignore npm errors</p>
          <div className="logs-container">
          {project?.logs.length > 0 ? (
            project?.logs.map((log, index) => (
              <div key={index} className="log-entry">
                <p><strong>{log.timestamp}:</strong> {log.message}</p>
              </div>
            ))
          ) : (
            <p>No Logs</p>
          )}
          </div>
        </>
      ) : (
        <div className="project-info">
          <p><strong>GitHub Link:</strong> {project.github_link}</p>
          <p><strong>Project ID:</strong> {project.project_id}</p>
          <p><strong>Project Type</strong> {project.project_type}</p>
          <p><strong>Project Link:</strong> {project.project_awslink ? <a href={project.project_awslink} target="_blank" rel="noopener noreferrer">{project.project_awslink}</a> : 'Once project is successfully deployed, link will appear here'}</p>
          {project.project_type === "express" && (
            <p><strong>Custom Link : (link may take some time to work)</strong> {project.project_customlink ? <a href={project.project_customlink} target="_blank" rel="noopener noreferrer">{project.project_customlink} </a> : 'Once project is successfully deployed, link will appear here'}</p>
          )}
          <div className="project-path">
            <p><strong>Note:</strong></p>
            <p className="project-path-info">
              Specify the path to the folder where you run `npm install` or `npm start`. Leave this field empty if your `index.js` file is located in the root directory of your GitHub repository.
            </p>
            <label>
              
              <div>
                <strong>Project Path : </strong>
                <input
                  type="text"
                  value={projectPath}
                  placeholder="e.g. backend/"
                  onChange={handleProjectPathChange}
                />
                {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
              </div>
            </label>
          </div>

          <div className="env-form">
            <h3>Environment Variables</h3>
            <button type="button" onClick={handleAddEnvDiv} className="btn add-env-btn">Add</button>
            <div className="env-list">
              {envDivs.map((envDiv, index) => (
                <div key={index} className="env-form-row">
                  <input
                    type="text"
                    name="key"
                    placeholder="Key"
                    value={envDiv.key}
                    onChange={(e) => handleEnvChange(index, e)}
                  />
                  <input
                    type="text"
                    name="value"
                    placeholder="Value"
                    value={envDiv.value}
                    onChange={(e) => handleEnvChange(index, e)}
                  />
                  <button type="button" onClick={() => handleDeleteEnvDiv(index)} className="btn delete-env-btn">Delete</button>
                </div>
              ))}
            </div>
          </div>
          <div className="container-deploy">
            <button
              type="button"
              onClick={handleSaveEnv}
              className={`btn save-env-btn ${!hasChanges ? 'disabled' : ''}`}
              disabled={!hasChanges}
            >
              Save
            </button>
            <button onClick={handleDelete} disabled={loading} className="btn delete-btn">Delete Project</button>
          </div>
        </div>
      )}
    </div>

  );
};

export default ProjectItems;
