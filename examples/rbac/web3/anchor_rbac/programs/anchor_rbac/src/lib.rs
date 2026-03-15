use anchor_lang::prelude::*;

declare_id!("txyHnTyAi8MiVFy3ZLQeqJiCHKt3FuJx2gg2pvab8T9");

#[program]
pub mod anchor_rbac {
    use super::*;

    /// WEB2 DEVELOPER NOTE:
    /// In Anchor, we use "Account Constraints" to handle RBAC declaratively.
    /// Instead of checking `if (user.role == 'ADMIN')` in the function body,
    /// we do it in the `Accounts` struct using the `constraint` attribute.

    pub fn close_profile(_ctx: Context<CloseProfile>) -> Result<()> {
        msg!("User profile closed. SOL returned to authority.");
        Ok(())
    }

    pub fn initialize_user_role(ctx: Context<InitializeUser>, role: u8) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        profile.owner = ctx.accounts.authority.key();
        profile.role = match role {
            0 => UserRole::Viewer,
            1 => UserRole::Editor,
            2 => UserRole::Admin,
            _ => return err!(RbacError::InvalidRole),
        };
        msg!("User profile initialized with role: {:?}", profile.role);
        Ok(())
    }

    pub fn admin_only_instruction(_ctx: Context<AdminOnly>) -> Result<()> {
        msg!("Access Granted: Admin only instruction executed.");
        Ok(())
    }

    pub fn editor_instruction(_ctx: Context<EditorOnly>) -> Result<()> {
        msg!("Access Granted: Editor or Admin instruction executed.");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init, 
        payer = authority, 
        space = 8 + 32 + 1,
        seeds = [b"user-profile", authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    // WEB2 NOTE: This constraint is like your 'checkRole(ADMIN)' middleware.
    #[account(
        seeds = [b"user-profile", authority.key().as_ref()],
        bump,
        constraint = user_profile.role == UserRole::Admin @ RbacError::Unauthorized
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EditorOnly<'info> {
    // WEB2 NOTE: Hierarchical check: Admin or Editor can access.
    #[account(
        seeds = [b"user-profile", authority.key().as_ref()],
        bump,
        constraint = (user_profile.role == UserRole::Admin || user_profile.role == UserRole::Editor) @ RbacError::Unauthorized
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseProfile<'info> {
    #[account(
        mut,
        seeds = [b"user-profile", authority.key().as_ref()],
        bump,
        close = authority
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub role: UserRole,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum UserRole {
    Viewer,
    Editor,
    Admin,
}

#[error_code]
pub enum RbacError {
    #[msg("You do not have the required permissions to perform this action.")]
    Unauthorized,
    #[msg("The provided role ID is invalid.")]
    InvalidRole,
}
