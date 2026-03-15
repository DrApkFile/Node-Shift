use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::ProgramError,
};
use borsh::{BorshDeserialize, BorshSerialize};

/// WEB2 DEVELOPER NOTE:
/// In Web2, your leaderboard is a DB table with a `DESC` index.
/// In Solana, we store the "Top N" users in a single large Account.
/// This implementation manages a top-5 leaderboard on-chain.
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct ScoreEntry {
    pub player: Pubkey,
    pub score: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Leaderboard {
    pub entries: Vec<ScoreEntry>, // Sorted DESC
}

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let leaderboard_account = next_account_info(accounts_iter)?;
    let player_account = next_account_info(accounts_iter)?;

    let mut leaderboard = Leaderboard::try_from_slice(&leaderboard_account.data.borrow())?;
    
    // Parse score from instruction data (u64)
    let new_score = u64::from_le_bytes(instruction_data[1..9].try_into().map_err(|_| ProgramError::InvalidInstructionData)?);

    match instruction_data[0] {
        0 => { // Submit Score
            msg!("New score submission: {}", new_score);
            
            // WEB2 NOTE: This is your 'UPDATE top_scores SET ...' logic
            // We check if the score makes it into the top 5
            leaderboard.entries.push(ScoreEntry { player: *player_account.key, score: new_score });
            leaderboard.entries.sort_by(|a, b| b.score.cmp(&a.score));
            leaderboard.entries.truncate(5);

            leaderboard.serialize(&mut &mut leaderboard_account.data.borrow_mut()[..])?;
            msg!("Leaderboard updated on-chain.");
        }
        _ => return Err(ProgramError::InvalidInstructionData),
    }

    Ok(())
}
