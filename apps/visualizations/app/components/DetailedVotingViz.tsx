import { Card } from "@repo/ui/components/card"
import { useEffect, useRef, useState } from 'react';

const DetailedVotingViz = () => {
  const [candidates, setCandidates] = useState([
    { id: '1', x: 0.3, y: 0.7, color: '#22c55e', name: 'Alice' },
    { id: '2', x: 0.5, y: 0.5, color: '#ef4444', name: 'Bob' },
    { id: '3', x: 0.7, y: 0.3, color: '#3b82f6', name: 'Charlie' }
  ]);
  const [voters, setVoters] = useState([]);
  const [ballots, setBallots] = useState([]);
  const [electionResults, setElectionResults] = useState(null);
  const [placementMode, setPlacementMode] = useState('none'); // 'voter' or 'candidate' or 'none'
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null);

  const CANVAS_SIZE = 400;

  // Calculate distance between two points
  const distance = (x1, y1, x2, y2) => 
    Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  // Get voter preferences based on distance
  const getVoterPreferences = (voterX, voterY) => {
    return candidates
      .map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        dist: distance(voterX, voterY, candidate.x, candidate.y)
      }))
      .sort((a, b) => a.dist - b.dist);
  };

  // Generate ballots for all voters
  const generateBallots = () => {
    const newBallots = voters.map(voter => {
      const prefs = getVoterPreferences(voter.x, voter.y);
      return {
        voterX: voter.x,
        voterY: voter.y,
        ranking: prefs.map(p => p.name)
      };
    });
    setBallots(newBallots);
    return newBallots;
  };

  // Run IRV election with the current ballots
  const runElection = (ballots) => {
    let rounds = [];
    let remainingCandidates = [...candidates];
    let currentBallots = [...ballots];
    
    while (remainingCandidates.length > 1) {
      // Count first preferences
      const voteCounts = {};
      remainingCandidates.forEach(c => voteCounts[c.name] = 0);
      
      currentBallots.forEach(ballot => {
        // Find first preference that's still in the race
        const firstChoice = ballot.ranking.find(name => 
          remainingCandidates.some(c => c.name === name)
        );
        if (firstChoice) {
          voteCounts[firstChoice]++;
        }
      });

      // Calculate round results
      const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
      const roundResults = remainingCandidates.map(candidate => ({
        name: candidate.name,
        votes: voteCounts[candidate.name],
        status: 'Active'
      }));

      // Check for majority
      const leader = Object.entries(voteCounts).reduce((a, b) => 
        a[1] > b[1] ? a : b
      );

      if (leader[1] > totalVotes / 2) {
        // We have a winner
        roundResults.find(r => r.name === leader[0]).status = 'Elected';
        roundResults.forEach(r => {
          if (r.status === 'Active') r.status = 'Rejected';
        });
        rounds.push(roundResults);
        break;
      }

      // Eliminate candidate with fewest votes
      const loser = Object.entries(voteCounts).reduce((a, b) => 
        a[1] < b[1] ? a : b
      );
      
      roundResults.find(r => r.name === loser[0]).status = 'Rejected';
      rounds.push(roundResults);
      
      remainingCandidates = remainingCandidates.filter(c => 
        c.name !== loser[0]
      );
    }

    setElectionResults(rounds);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    for (let i = 0; i <= 10; i++) {
      const pos = (i / 10) * CANVAS_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }

    // Draw voters
    voters.forEach((voter, index) => {
      ctx.beginPath();
      ctx.arc(
        voter.x * CANVAS_SIZE,
        (1 - voter.y) * CANVAS_SIZE,
        4,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = '#4b5563';
      ctx.fill();
      ctx.fillText(`V${index + 1}`, 
        voter.x * CANVAS_SIZE + 8, 
        (1 - voter.y) * CANVAS_SIZE + 4
      );
    });

    // Draw candidates
    candidates.forEach(candidate => {
      ctx.beginPath();
      ctx.arc(
        candidate.x * CANVAS_SIZE,
        (1 - candidate.y) * CANVAS_SIZE,
        8,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = candidate.color;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = 'black';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        candidate.name,
        candidate.x * CANVAS_SIZE,
        (1 - candidate.y) * CANVAS_SIZE + 20
      );
    });
  };

  useEffect(() => {
    drawCanvas();
  }, [candidates, voters, placementMode]);

  const handleCanvasClick = (e) => {
    if (placementMode === 'none') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / CANVAS_SIZE;
    const y = 1 - ((e.clientY - rect.top) / CANVAS_SIZE);

    if (placementMode === 'voter') {
      setVoters([...voters, { x, y }]);
    }
  };

  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / CANVAS_SIZE;
    const y = 1 - ((e.clientY - rect.top) / CANVAS_SIZE);

    const clickedCandidate = candidates.find(candidate =>
      distance(x, y, candidate.x, candidate.y) < 0.05
    );

    if (clickedCandidate) {
      setIsDragging(clickedCandidate.id);
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / CANVAS_SIZE));
    const y = Math.max(0, Math.min(1, 1 - ((e.clientY - rect.top) / CANVAS_SIZE)));

    setCandidates(candidates.map(c =>
      c.id === isDragging ? { ...c, x, y } : c
    ));
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(null);
  };

  return (
    <Card className="w-full max-w-6xl p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={() => setPlacementMode(mode => mode === 'voter' ? 'none' : 'voter')}
            className={`px-4 py-2 rounded-lg ${
              placementMode === 'voter' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {placementMode === 'voter' ? 'Finish Placing Voters' : 'Place Voters'}
          </button>
          <button
            onClick={() => {
              const newBallots = generateBallots();
              runElection(newBallots);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            disabled={voters.length === 0}
          >
            Generate & Run Election
          </button>
          <button
            onClick={() => setVoters([])}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Clear Voters
          </button>
        </div>

        <div className="border rounded-lg p-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full border rounded cursor-move"
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>

        {ballots.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generated Ballots</h3>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
              {ballots.map((ballot, i) => (
                <div key={i}>
                  Ranked ballot: {ballot.ranking.join(', ')}
                </div>
              ))}
            </div>
          </div>
        )}

        {electionResults && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Election Results</h3>
            {electionResults.map((round, roundIndex) => (
              <div key={roundIndex} className="bg-gray-50 p-4 rounded-lg">
                <div className="font-semibold mb-2">
                  {roundIndex === electionResults.length - 1 ? 'FINAL RESULT' : `ROUND ${roundIndex + 1}`}
                </div>
                <div className="font-mono">
                  <div className="grid grid-cols-3 gap-4 font-bold mb-1">
                    <div>Candidate</div>
                    <div>Votes</div>
                    <div>Status</div>
                  </div>
                  {round.map((result, i) => (
                    <div key={i} className="grid grid-cols-3 gap-4">
                      <div>{result.name}</div>
                      <div>{result.votes}</div>
                      <div>{result.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default DetailedVotingViz;