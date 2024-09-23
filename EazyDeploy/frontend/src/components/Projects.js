import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/config.js';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isverified, setisverified] = useState(true);
  const [githubLink, setGithubLink] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projectType, setProjectType] = useState('express'); 
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const { data } = await axios.get(`${API_BASE_URL}/users/projects`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setisverified(data.isverify);
          setProjects(data.allprojects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, [isCreating]);

  const handleProjectidchange = (e) => {
    const newValue = e.target.value;
    if (/^[a-zA-Z0-9]*$/.test(newValue)) {
      setProjectId(newValue);
    }
  };

  const handleVerify = () => {
    navigate('/verify');
  }
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_BASE_URL}/users/projects`, {
        github_link: githubLink,
        project_id: projectId,
        project_type: projectType, 
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setGithubLink('');
      setProjectId('');
      setProjectType('express'); // Reset to default
      navigate(`/projects/${data._id}`);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        alert('Project ID should be unique');
      } else {
        console.error('Error creating project:', error);
        alert('An error occurred while creating the project. Please try again.');
      }
    }
  };

  return (
    <div className="projects-container">
      <h2>Your Projects</h2>
      { isverified ? (
      <>
      {isCreating ? (
        <form onSubmit={handleCreateProject} className="project-form">
        <h3>Create New Project</h3>
        
        <div className="form-group">
          <label htmlFor="githubLink">GitHub Link:</label>
          <input
            id="githubLink"
            type="text"
            placeholder="URL of your project"
            value={githubLink}
            onChange={(e) => setGithubLink(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="projectId">Project ID:</label>
          <input
            id="projectId"
            type="text"
            placeholder="Enter alphanumeric value"
            value={projectId}
            onChange={handleProjectidchange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="projectType">Project Type:</label>
          <select
            id="projectType"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="project-type-select"
          >
            <option value="express">Express</option>
            <option value="react">React</option>
          </select>
        </div>
        
        <button type="submit" className="btn create-btn">Create Project</button>
        <button type="button" className="btn cancel-btn" onClick={() => setIsCreating(false)}>Cancel</button>
      </form>
      ) : (
        <>
          <button className="btn create-project-btn" onClick={() => setIsCreating(true)}>Create New Project</button>
          {projects.length ? (
            projects.map((project) => (
              <Link
                key={project._id} 
                to={`/projects/${project._id}`} 
                className="project-overview"
              >
                <p><strong>GitHub Link:</strong> {project.github_link}</p>
                <p><strong>Project ID:</strong> {project.project_id}</p>
                <p><strong>Project Type:</strong> {project.project_type}</p>
              </Link>
            ))
          ) : (
            <p>No projects available</p>
          )}
        </>
      )}
      </>)
      : (
        <>
          <p>Please verify your email</p>
          <button className="btn" onClick={handleVerify}>Verify</button>
        </>
      )}
    </div>
  );
};

export default Projects;
